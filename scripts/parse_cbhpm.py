#!/usr/bin/env python3
"""
Parse CBHPM file and generate SQL INSERT statements
"""

cbhpm_data = """10101012	Em consultório (no horário normal ou preestabelecido)	R$ 92,21
10101020	Em domicílio	
10101039	Em pronto socorro	R$ 92,21
10102019	Visita hospitalar a paciente internado	R$ 45,08
10103015	Atendimento ao recém-nascido em berçário	R$ 144,26
10103031	Atendimento ao recém-nascido em sala de parto (parto normal ou operatório de alto risco)	R$ 247,95
10103023	Atendimento ao recém-nascido em sala de parto (parto normal ou operatório de baixo risco)	R$ 213,01
10104011	Atendimento do intensivista diarista (por dia e por paciente)	R$ 60,86
10104020	Atendimento médico do intensivista em UTI geral ou pediátrica (plantão de 12 horas - por paciente)	R$ 144,26
10105077	Acompanhamento médico para transporte intra-hospitalar de pacientes graves, com ventilação assistida, da UTI para o centro de diagnósitco	R$ 60,86
10105050	Transporte extra-hospitalar aéreo ou aquático de pacientes graves, 1ª hora - a partir do deslocamento do médico	R$ 172,44
10105069	Transporte extra-hospitalar aéreo ou aquático de pacientes graves, por hora adicional	R$ 60,86
10105034	Transporte extra-hospitalar terrestre de pacientes graves, 1ª hora - a partir do deslocamento do médico	R$ 144,26
10105042	Transporte extra-hospitalar terrestre de pacientes graves, por hora adicional - até o retorno do médico à base	R$ 60,86
10106014	Aconselhamento genético	R$ 172,44
10106146	Atendimento ambulatorial em puericultura	R$ 126,23
10106030	Atendimento ao familiar do adolescente	R$ 33,81
10106049	Atendimento pediátrico a gestantes (3º trimestre)	R$ 60,86"""

clinic_id = "dcee437c-fd14-463c-b25e-a318f5da6bb7"

lines = cbhpm_data.strip().split('\n')
print(f"-- Total de {len(lines)} procedimentos para inserir\n")
print("INSERT INTO cbhpm_procedures (clinic_id, codigo_cbhpm, descricao_completa, codigo_tuss, valor_tabela, ativo, created_at)")
print("VALUES")

for i, line in enumerate(lines):
    parts = line.split('\t')
    if len(parts) >= 2:
        code = parts[0].strip()
        description = parts[1].strip().replace("'", "''")  # Escape quotes
        price = None
        
        if len(parts) >= 3 and parts[2].strip():
            price_str = parts[2].strip().replace("R$ ", "").replace(",", ".")
            try:
                price = float(price_str)
            except:
                price = None
        
        # Generate SQL
        price_sql = f"{price}" if price else "NULL"
        comma = "," if i < len(lines) - 1 else ";"
        
        print(f"('{clinic_id}', '{code}', '{description}', '{code}', {price_sql}, true, NOW()){comma}")

print(f"\n-- Total: {len(lines)} linhas inseridas")
