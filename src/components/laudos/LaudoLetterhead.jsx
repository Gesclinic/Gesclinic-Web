import React from 'react';
import { getClinicLogoPublicURL } from '@/lib/clinicBranding';

function collectLines(...values) {
  return values.filter(Boolean);
}

export default function LaudoLetterhead({ letterhead = {}, compact = false, section = 'all' }) {
  const logoUrl = getClinicLogoPublicURL(letterhead?.clinic_logo_url);
  const clinicLines = collectLines(
    letterhead?.clinic_display_name,
    letterhead?.clinic_address_line,
    letterhead?.clinic_contact_line,
  );
  const professionalLines = collectLines(
    letterhead?.professional_display_name,
    letterhead?.professional_title_line,
    letterhead?.professional_address_line,
    letterhead?.professional_contact_line,
  );

  const showClinic = section === 'all' || section === 'clinic';
  const showProfessional = section === 'all' || section === 'professional';

  if (
    (!showClinic || !clinicLines.length) &&
    (!showProfessional || !professionalLines.length) &&
    (!showClinic || !logoUrl)
  ) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-4' : 'p-5'} shadow-sm`}
    >
      <div className="flex items-start gap-4">
        {showClinic && logoUrl ? (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={logoUrl}
              alt="Logo da clínica"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          {showClinic && clinicLines.length ? (
            <div>
              <p className="text-base font-semibold text-slate-900">{clinicLines[0]}</p>
              {clinicLines.slice(1).map((line) => (
                <p key={`clinic-${line}`} className="text-sm leading-5 text-slate-600">
                  {line}
                </p>
              ))}
            </div>
          ) : null}

          {showProfessional && professionalLines.length ? (
            <div
              className={`${showClinic && clinicLines.length ? 'mt-3 border-t border-slate-200 pt-3' : ''}`}
            >
              <p className="text-sm font-semibold text-slate-900">{professionalLines[0]}</p>
              {professionalLines.slice(1).map((line) => (
                <p key={`professional-${line}`} className="text-sm leading-5 text-slate-600">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
