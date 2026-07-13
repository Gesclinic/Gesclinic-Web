import { supabase } from '@/lib/customSupabaseClient';

function isMissingColumnError(error) {
	const text = String(error?.message || error?.details || '').toLowerCase();
	return error?.code === '42703' || text.includes('could not find') || (text.includes('column') && text.includes('does not exist'));
}

function getMissingColumnName(error) {
	const text = String(error?.message || error?.details || '');
	return text.match(/Could not find the '([^']+)' column/i)?.[1]
		|| text.match(/column "?([a-zA-Z0-9_]+)"? of relation/i)?.[1]
		|| text.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i)?.[1]
		|| null;
}

function omitColumn(payload, columnName) {
	if (!columnName || !(columnName in payload)) return payload;
	const { [columnName]: _removed, ...rest } = payload;
	return rest;
}

async function updateRowsWithOptionalColumns(table, ids, payload) {
	if (!ids.length) {
		return { updated: 0, skipped: true };
	}

	let updatePayload = payload;
	let { data, error } = await supabase
		.from(table)
		.update(updatePayload)
		.in('id', ids)
		.select('id');

	const removedColumns = new Set();
	for (let attempt = 0; attempt < 12 && error && isMissingColumnError(error); attempt += 1) {
		const missingColumn = getMissingColumnName(error);
		if (!missingColumn || removedColumns.has(missingColumn)) {
			break;
		}

		removedColumns.add(missingColumn);
		updatePayload = omitColumn(updatePayload, missingColumn);
		const retry = await supabase
			.from(table)
			.update(updatePayload)
			.in('id', ids)
			.select('id');
		data = retry.data;
		error = retry.error;
	}

	if (error) {
		throw error;
	}

	return { updated: data?.length || 0, removedColumns: Array.from(removedColumns) };
}

async function safeSelect(stepName, queryBuilder) {
	try {
		const { data, error } = await queryBuilder;
		if (error) throw error;
		return { data: data || [], error: null };
	} catch (error) {
		console.warn(`[financialReversalApi] ${stepName} skipped:`, error?.message || error);
		return { data: [], error };
	}
}

function isInvoiceCanceled(invoice) {
	const status = String(invoice?.status || '').toLowerCase().trim();
	return ['canceled', 'cancelled', 'cancelada', 'cancelado'].includes(status) || Boolean(invoice?.canceled_at);
}

function formatInvoiceLabel(invoice) {
	return invoice?.invoice_number || invoice?.number || invoice?.id || 'sem numero';
}

function indexById(rows) {
	return new Map((rows || []).filter((row) => row?.id).map((row) => [row.id, row]));
}

async function assertNoActiveInvoicesForAppointment({ clinicId, appointmentId }) {
	const { data, error } = await supabase
		.from('invoices')
		.select('id, invoice_number, status, canceled_at')
		.eq('clinic_id', clinicId)
		.eq('appointment_id', appointmentId);

	if (error) {
		throw new Error(`Erro ao verificar NF vinculada ao atendimento: ${error.message}`);
	}

	const activeInvoices = (data || []).filter((invoice) => !isInvoiceCanceled(invoice));
	if (activeInvoices.length > 0) {
		const invoiceLabels = activeInvoices.map(formatInvoiceLabel).join(', ');
		throw new Error(
			`Existe NF vinculada ao atendimento (${invoiceLabels}). Cancele primeiro a NF no sistema e na prefeitura antes de solicitar ou executar o estorno financeiro.`,
		);
	}
}

async function insertFinancialAudit({ clinicId, appointmentId, patientId, amount, paymentMethod, reason, userId, snapshot, steps }) {
	const { error } = await supabase.from('financial_audits').insert({
		clinic_id: clinicId,
		appointment_id: appointmentId,
		patient_id: patientId || null,
		action: 'APPOINTMENT_FINANCIAL_REVERSED',
		amount,
		payment_method: paymentMethod || null,
		object_data: {
			reason,
			snapshot,
			steps,
			reversed_at: new Date().toISOString(),
		},
		performed_by: userId,
		performed_at: new Date().toISOString(),
		user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
	});

	if (error) throw error;
}

export async function requestAppointmentFinancialReversalApproval({ appointmentId, clinicId, reason, userId, userRole }) {
	if (!appointmentId || !clinicId) {
		throw new Error('Atendimento e clinica sao obrigatorios para solicitar estorno.');
	}
	if (!reason?.trim()) {
		throw new Error('Informe o motivo do estorno para solicitar liberacao.');
	}
	if (!userId) {
		throw new Error('Usuario nao identificado para registrar a solicitacao.');
	}

	await assertNoActiveInvoicesForAppointment({ clinicId, appointmentId });

	const { data: receivables, error } = await supabase
		.from('ar_invoices')
		.select('id, patient_id, status, amount, net_value, payment_method')
		.eq('clinic_id', clinicId)
		.eq('appointment_id', appointmentId);

	if (error) {
		throw new Error(`Erro ao localizar financeiro do atendimento: ${error.message}`);
	}

	const activeReceivables = (receivables || []).filter(
		(row) => !['canceled', 'cancelado', 'reversed', 'estornado'].includes(String(row.status || '').toLowerCase()),
	);

	if (activeReceivables.length === 0) {
		throw new Error('Nao ha financeiro ativo para solicitar estorno neste atendimento.');
	}

	const existingRequests = await listFinancialReversalRequests({ clinicId, status: 'pending' });
	const alreadyPending = existingRequests.some((request) => request.appointment_id === appointmentId);
	if (alreadyPending) {
		throw new Error('Ja existe uma solicitacao de estorno pendente para este atendimento. Aguarde a decisao no Financeiro.');
	}

	const amount = activeReceivables.reduce((sum, row) => sum + Number(row.net_value ?? row.amount ?? 0), 0);
	const paymentMethod = activeReceivables.map((row) => row.payment_method).filter(Boolean).join(' + ');
	const patientId = activeReceivables.find((row) => row.patient_id)?.patient_id || null;

	const { error: auditError } = await supabase.from('financial_audits').insert({
		clinic_id: clinicId,
		appointment_id: appointmentId,
		patient_id: patientId || null,
		action: 'APPOINTMENT_FINANCIAL_REVERSAL_REQUESTED',
		amount,
		payment_method: paymentMethod || null,
		object_data: {
			reason: reason.trim(),
			status: 'pending_approval',
			requested_by_role: userRole || null,
			required_roles: ['admin', 'gestor', 'financeiro'],
			required_permission: 'financeiro.estorno',
			receivable_ids: activeReceivables.map((row) => row.id),
			requested_at: new Date().toISOString(),
		},
		performed_by: userId,
		performed_at: new Date().toISOString(),
		user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
	});

	if (auditError) {
		throw auditError;
	}

	return {
		success: true,
		status: 'pending_approval',
		amount,
		receivableIds: activeReceivables.map((row) => row.id),
	};
}

async function createCashReversal({ clinicId, amount, paymentMethod, userId, reason, appointmentId }) {
	if (!amount || amount <= 0) {
		return { created: 0, skipped: true };
	}

	const today = new Date().toISOString().split('T')[0];
	const now = new Date().toISOString();
	const { data: cashSession, error: sessionError } = await supabase
		.from('cash_register_sessions')
		.select('id, current_balance')
		.eq('clinic_id', clinicId)
		.eq('session_date', today)
		.eq('status', 'open')
		.maybeSingle();

	if (sessionError) {
		throw sessionError;
	}

	if (!cashSession?.id) {
		return { created: 0, skipped: true, reason: 'Nenhum caixa aberto hoje para movimento compensatorio.' };
	}

	await supabase
		.from('cash_register_sessions')
		.update({ current_balance: Number(cashSession.current_balance || 0) - Number(amount || 0) })
		.eq('id', cashSession.id);

	const { data, error } = await supabase
		.from('cash_register_movements')
		.insert({
			cash_session_id: cashSession.id,
			clinic_id: clinicId,
			movement_type: 'EXPENSE',
			amount,
			payment_method: paymentMethod || 'ESTORNO',
			received_by: userId,
			created_by: userId,
			description: `Estorno financeiro do atendimento ${appointmentId}. Motivo: ${reason}`,
			recorded_at: now,
		})
		.select('id');

	if (error) throw error;
	return { created: data?.length || 0, movementIds: (data || []).map((row) => row.id) };
}

async function reverseOperatorCashDrawerMovements({ clinicId, appointmentId, userId, reason }) {
	const { data: drawerMovements, error: drawerError } = await supabase
		.from('drawer_movements')
		.select('*')
		.eq('clinic_id', clinicId)
		.eq('appointment_id', appointmentId)
		.eq('payment_type', 'entrada');

	if (drawerError) throw drawerError;

	const activeDrawerMovements = (drawerMovements || []).filter(
		(row) => !String(row.description || '').toLowerCase().includes('estorno'),
	);

	const reversalRows = activeDrawerMovements.map((movement) => ({
		drawer_id: movement.drawer_id,
		clinic_id: clinicId,
		appointment_id: appointmentId,
		payment_method: movement.payment_method,
		payment_type: 'saida',
		amount: Number(movement.amount || 0),
		description: `Estorno do atendimento #${appointmentId}. Motivo: ${reason}`,
	})).filter((movement) => movement.amount > 0);

	let insertedDrawerReversals = [];
	if (reversalRows.length > 0) {
		const { data, error } = await supabase
			.from('drawer_movements')
			.insert(reversalRows)
			.select('id');

		if (error) throw error;
		insertedDrawerReversals = data || [];
	}

	const descriptions = activeDrawerMovements.map((movement) => movement.description).filter(Boolean);
	let cashMovementIds = [];
	if (descriptions.length > 0) {
		const { data: cashMovements, error: cashError } = await supabase
			.from('cash_movements')
			.select('id')
			.eq('clinic_id', clinicId)
			.eq('origin', 'agenda')
			.in('description', descriptions);

		if (cashError) throw cashError;

		cashMovementIds = (cashMovements || []).map((row) => row.id).filter(Boolean);
		if (cashMovementIds.length > 0) {
			await updateRowsWithOptionalColumns('cash_movements', cashMovementIds, {
				status: 'estornado',
				description: `Estornado pelo atendimento #${appointmentId}. Motivo: ${reason}`,
				updated_by: userId,
				updated_at: new Date().toISOString(),
			});
		}
	}

	return {
		cashMovementsReversed: cashMovementIds.length,
		drawerReversalMovementsCreated: insertedDrawerReversals.length,
	};
}

export async function reverseAppointmentFinancialOperation({ appointmentId, clinicId, reason, userId }) {
	if (!appointmentId || !clinicId) {
		throw new Error('Atendimento e clinica sao obrigatorios para estornar.');
	}
	if (!reason?.trim()) {
		throw new Error('Informe o motivo do estorno para rastreabilidade.');
	}
	if (!userId) {
		throw new Error('Usuario nao identificado para registrar a rastreabilidade do estorno.');
	}

	await assertNoActiveInvoicesForAppointment({ clinicId, appointmentId });

	const now = new Date().toISOString();
	const steps = [];
	const reversalMetadata = {
		reversed: true,
		reversed_at: now,
		reversed_by: userId,
		reversal_reason: reason.trim(),
		source: 'appointment_financial_reversal',
	};

	const { data: receivables, error: receivableError } = await supabase
		.from('ar_invoices')
		.select('*')
		.eq('clinic_id', clinicId)
		.eq('appointment_id', appointmentId);

	if (receivableError) {
		throw new Error(`Erro ao localizar financeiro do atendimento: ${receivableError.message}`);
	}

	const activeReceivables = (receivables || []).filter(
		(row) => !['canceled', 'cancelado', 'reversed', 'estornado'].includes(String(row.status || '').toLowerCase()),
	);

	if (activeReceivables.length === 0) {
		throw new Error('Nao ha financeiro ativo para estornar neste atendimento.');
	}

	const receivableIds = activeReceivables.map((row) => row.id);
	const patientId = activeReceivables.find((row) => row.patient_id)?.patient_id || null;
	const totalAmount = activeReceivables.reduce((sum, row) => sum + Number(row.net_value ?? row.amount ?? 0), 0);
	const paymentMethod = activeReceivables.map((row) => row.payment_method).filter(Boolean).join(' + ');

	const { data: payments } = await safeSelect(
		'receivable_payments',
		supabase.from('receivable_payments').select('*').in('ar_invoice_id', receivableIds),
	);
	const { data: transactionsByReceivable } = await safeSelect(
		'financial_transactions by receivable',
		supabase.from('financial_transactions').select('*').eq('clinic_id', clinicId).in('origin_id', receivableIds),
	);
	const { data: transactionsByAppointment } = await safeSelect(
		'financial_transactions by appointment',
		supabase.from('financial_transactions').select('*').eq('clinic_id', clinicId).eq('origin_id', appointmentId),
	);
	const { data: journalEntries } = await safeSelect(
		'journal_entries',
		supabase.from('journal_entries').select('*').eq('clinic_id', clinicId).eq('appointment_id', appointmentId),
	);

	const snapshot = {
		receivables: activeReceivables,
		receivable_payments: payments,
		financial_transactions: [...transactionsByReceivable, ...transactionsByAppointment],
		journal_entries: journalEntries,
	};

	const receivableResults = [];
	for (const receivable of activeReceivables) {
		const balance = Number(receivable.net_value ?? receivable.amount ?? 0);
		const metadata = {
			...(receivable.metadata || {}),
			reversal: reversalMetadata,
			reversal_snapshot: {
				status: receivable.status,
				received_value: receivable.received_value,
				paid_total: receivable.paid_total,
				balance_amount: receivable.balance_amount,
			},
		};

		receivableResults.push(await updateRowsWithOptionalColumns('ar_invoices', [receivable.id], {
			status: 'reversed',
			enterprise_status: 'ESTORNADO',
			received_value: 0,
			paid_total: 0,
			balance_amount: balance,
			reversed_at: now,
			metadata,
		}));
	}
	steps.push({ name: 'Contas a receber', status: `estornado (${receivableResults.length})` });

	if (payments.length > 0) {
		await updateRowsWithOptionalColumns('receivable_payments', payments.map((row) => row.id), {
			status: 'reversed',
			reversed_at: now,
			metadata: { reversal: reversalMetadata },
		});
	}
	steps.push({ name: 'Historico de pagamentos', status: payments.length ? `estornado (${payments.length})` : 'sem registros' });

	const transactionIds = [...new Set([...transactionsByReceivable, ...transactionsByAppointment].map((row) => row.id).filter(Boolean))];
	if (transactionIds.length > 0) {
		await updateRowsWithOptionalColumns('financial_transactions', transactionIds, {
			status: 'canceled',
			canceled_at: now,
			reversed_at: now,
			notes: `Estornado pelo atendimento ${appointmentId}. Motivo: ${reason.trim()}`,
			metadata: { reversal: reversalMetadata },
		});
	}
	steps.push({ name: 'Transacoes financeiras', status: transactionIds.length ? `canceladas (${transactionIds.length})` : 'sem registros' });

	if (journalEntries.length > 0) {
		await updateRowsWithOptionalColumns('journal_entries', journalEntries.map((row) => row.id), {
			entry_type: 'REVERSED_RECEIPT',
			description: `Estornado: ${journalEntries[0]?.description || 'recebimento do atendimento'}`,
			debit_amount: 0,
			credit_amount: 0,
			reversed_at: now,
			reversal_reason: reason.trim(),
		});
	}
	steps.push({ name: 'Lancamentos contabeis', status: journalEntries.length ? `zerados/estornados (${journalEntries.length})` : 'sem registros' });

	try {
		const cashResult = await createCashReversal({
			clinicId,
			amount: totalAmount,
			paymentMethod,
			userId,
			reason: reason.trim(),
			appointmentId,
		});
		steps.push({ name: 'Caixa', status: cashResult.skipped ? `sem movimento compensatorio (${cashResult.reason || 'nao aplicavel'})` : `movimento compensatorio criado (${cashResult.created})` });
	} catch (error) {
		steps.push({ name: 'Caixa', status: `pendente: ${error.message}` });
	}

	try {
		const operatorCashResult = await reverseOperatorCashDrawerMovements({
			clinicId,
			appointmentId,
			userId,
			reason: reason.trim(),
		});
		steps.push({
			name: 'Caixa individual/geral',
			status: operatorCashResult.drawerReversalMovementsCreated || operatorCashResult.cashMovementsReversed
				? `estornado (${operatorCashResult.cashMovementsReversed} movimentos, ${operatorCashResult.drawerReversalMovementsCreated} compensacoes)`
				: 'sem movimentos vinculados',
		});
	} catch (error) {
		steps.push({ name: 'Caixa individual/geral', status: `pendente: ${error.message}` });
	}

	await insertFinancialAudit({
		clinicId,
		appointmentId,
		patientId,
		amount: totalAmount,
		paymentMethod,
		reason: reason.trim(),
		userId,
		snapshot,
		steps,
	});
	steps.push({ name: 'Auditoria', status: 'registrada com snapshot' });

	return {
		success: true,
		appointmentId,
		receivableIds,
		amount: totalAmount,
		steps,
	};
}

function parseObjectData(value) {
	if (!value) return {};
	if (typeof value === 'string') {
		try {
			return JSON.parse(value);
		} catch (_error) {
			return {};
		}
	}
	return value;
}

function getRequestStatus(request, resolutionByRequestId) {
	const resolution = resolutionByRequestId.get(request.id);
	if (resolution?.action === 'APPOINTMENT_FINANCIAL_REVERSAL_CANCELED') return 'canceled';
	if (resolution?.action === 'APPOINTMENT_FINANCIAL_REVERSAL_REJECTED') return 'rejected';
	if (resolution?.action === 'APPOINTMENT_FINANCIAL_REVERSAL_APPROVED') return 'approved';
	if (resolution?.action === 'APPOINTMENT_FINANCIAL_REVERSED') return 'approved';
	return 'pending';
}

export async function listFinancialReversalRequests({ clinicId, status = 'pending' } = {}) {
	if (!clinicId) {
		return [];
	}

	const { data, error } = await supabase
		.from('financial_audits')
		.select('*')
		.eq('clinic_id', clinicId)
		.in('action', [
			'APPOINTMENT_FINANCIAL_REVERSAL_REQUESTED',
			'APPOINTMENT_FINANCIAL_REVERSAL_APPROVED',
			'APPOINTMENT_FINANCIAL_REVERSAL_REJECTED',
			'APPOINTMENT_FINANCIAL_REVERSAL_CANCELED',
			'APPOINTMENT_FINANCIAL_REVERSED',
		])
		.order('performed_at', { ascending: false })
		.limit(500);

	if (error) {
		throw new Error(error.message);
	}

	const rows = (data || []).map((row) => ({ ...row, object_data: parseObjectData(row.object_data) }));
	const requests = rows.filter((row) => row.action === 'APPOINTMENT_FINANCIAL_REVERSAL_REQUESTED');
	const resolutions = rows.filter((row) => row.action !== 'APPOINTMENT_FINANCIAL_REVERSAL_REQUESTED');
	const resolutionByRequestId = new Map();

	resolutions.forEach((row) => {
		const requestId = row.object_data?.request_audit_id;
		if (requestId && !resolutionByRequestId.has(requestId)) {
			resolutionByRequestId.set(requestId, row);
		}
	});

	const enrichedRequests = requests
		.map((request) => {
			const requestStatus = getRequestStatus(request, resolutionByRequestId);
			return {
				...request,
				request_status: requestStatus,
				resolution: resolutionByRequestId.get(request.id) || null,
			};
		})
		.filter((request) => status === 'all' || request.request_status === status);

	const appointmentIds = Array.from(new Set(enrichedRequests.map((request) => request.appointment_id).filter(Boolean)));
	const patientIdsFromRequests = enrichedRequests.map((request) => request.patient_id).filter(Boolean);
	const receivableIds = Array.from(new Set(enrichedRequests.flatMap((request) => request.object_data?.receivable_ids || []).filter(Boolean)));
	const userIds = Array.from(new Set(enrichedRequests.map((request) => request.performed_by).filter(Boolean)));

	const { data: appointments } = await safeSelect(
		'listFinancialReversalRequests.appointments',
		supabase
			.from('appointments')
			.select('id, scheduled_date, scheduled_time, patient_id, service_id, status')
			.in('id', appointmentIds),
	);

	const serviceIds = Array.from(new Set((appointments || []).map((appointment) => appointment.service_id).filter(Boolean)));
	const patientIds = Array.from(new Set([...patientIdsFromRequests, ...(appointments || []).map((appointment) => appointment.patient_id).filter(Boolean)]));

	const [{ data: patients }, { data: services }, { data: receivables }, { data: users }] = await Promise.all([
		safeSelect(
			'listFinancialReversalRequests.patients',
			supabase.from('patients').select('id, name, phone, cell_phone, document_id').in('id', patientIds),
		),
		safeSelect(
			'listFinancialReversalRequests.services',
			supabase.from('services').select('id, name, code, tuss_code').in('id', serviceIds),
		),
		safeSelect(
			'listFinancialReversalRequests.receivables',
			supabase.from('ar_invoices').select('id, status, amount, net_value, payment_method').in('id', receivableIds),
		),
		safeSelect(
			'listFinancialReversalRequests.users',
			supabase.from('users').select('id, full_name, email, username').in('id', userIds),
		),
	]);

	const appointmentsById = indexById(appointments);
	const patientsById = indexById(patients);
	const servicesById = indexById(services);
	const receivablesById = indexById(receivables);
	const usersById = indexById(users);

	return enrichedRequests.map((request) => {
		const appointment = appointmentsById.get(request.appointment_id) || null;
		const patient = patientsById.get(request.patient_id || appointment?.patient_id) || null;
		const service = servicesById.get(appointment?.service_id) || null;
		const requestReceivables = (request.object_data?.receivable_ids || [])
			.map((id) => receivablesById.get(id))
			.filter(Boolean);

		return {
			...request,
			appointment,
			patient,
			service,
			requester: usersById.get(request.performed_by) || null,
			receivables: requestReceivables,
		};
	});
}

export async function getLatestAppointmentFinancialReversalRequest({ clinicId, appointmentId } = {}) {
	if (!clinicId || !appointmentId) {
		return null;
	}

	const requests = await listFinancialReversalRequests({ clinicId, status: 'all' });
	return requests.find((request) => request.appointment_id === appointmentId) || null;
}

async function insertReversalDecisionAudit({ request, action, userId, note, result = null }) {
	const objectData = parseObjectData(request.object_data);
	const { error } = await supabase.from('financial_audits').insert({
		clinic_id: request.clinic_id,
		appointment_id: request.appointment_id,
		patient_id: request.patient_id || null,
		action,
		amount: request.amount,
		payment_method: request.payment_method || null,
		object_data: {
			request_audit_id: request.id,
			reason: objectData.reason || null,
			note: note || null,
			result,
			decided_at: new Date().toISOString(),
		},
		performed_by: userId,
		performed_at: new Date().toISOString(),
		user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
	});

	if (error) throw error;
}

export async function approveFinancialReversalRequest({ requestId, clinicId, userId, note = '' } = {}) {
	if (!requestId || !clinicId || !userId) {
		throw new Error('Solicitacao, clinica e usuario sao obrigatorios para aprovar.');
	}

	const { data: request, error } = await supabase
		.from('financial_audits')
		.select('*')
		.eq('id', requestId)
		.eq('clinic_id', clinicId)
		.eq('action', 'APPOINTMENT_FINANCIAL_REVERSAL_REQUESTED')
		.maybeSingle();

	if (error) throw new Error(error.message);
	if (!request) throw new Error('Solicitacao de estorno nao encontrada.');

	const objectData = parseObjectData(request.object_data);
	const result = await reverseAppointmentFinancialOperation({
		appointmentId: request.appointment_id,
		clinicId,
		reason: objectData.reason || 'Estorno aprovado pela fila de solicitacoes.',
		userId,
	});

	await insertReversalDecisionAudit({
		request,
		action: 'APPOINTMENT_FINANCIAL_REVERSAL_APPROVED',
		userId,
		note,
		result,
	});

	return result;
}

export async function rejectFinancialReversalRequest({ requestId, clinicId, userId, note = '' } = {}) {
	if (!requestId || !clinicId || !userId) {
		throw new Error('Solicitacao, clinica e usuario sao obrigatorios para rejeitar.');
	}

	const { data: request, error } = await supabase
		.from('financial_audits')
		.select('*')
		.eq('id', requestId)
		.eq('clinic_id', clinicId)
		.eq('action', 'APPOINTMENT_FINANCIAL_REVERSAL_REQUESTED')
		.maybeSingle();

	if (error) throw new Error(error.message);
	if (!request) throw new Error('Solicitacao de estorno nao encontrada.');

	await insertReversalDecisionAudit({
		request,
		action: 'APPOINTMENT_FINANCIAL_REVERSAL_REJECTED',
		userId,
		note,
	});

	return { success: true };
}

export async function cancelFinancialReversalRequest({ requestId, clinicId, userId, note = '' } = {}) {
	if (!requestId || !clinicId || !userId) {
		throw new Error('Solicitacao, clinica e usuario sao obrigatorios para cancelar.');
	}

	const { data: request, error } = await supabase
		.from('financial_audits')
		.select('*')
		.eq('id', requestId)
		.eq('clinic_id', clinicId)
		.eq('action', 'APPOINTMENT_FINANCIAL_REVERSAL_REQUESTED')
		.maybeSingle();

	if (error) throw new Error(error.message);
	if (!request) throw new Error('Solicitacao de estorno nao encontrada.');

	await insertReversalDecisionAudit({
		request,
		action: 'APPOINTMENT_FINANCIAL_REVERSAL_CANCELED',
		userId,
		note,
	});

	return { success: true };
}
