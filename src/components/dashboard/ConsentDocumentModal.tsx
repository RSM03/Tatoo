'use client';

import React from 'react';
import { X, Printer, ShieldCheck, FileText, CheckCircle2, User, Calendar, MapPin, Phone, Mail } from 'lucide-react';

interface ConsentDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  consent: any;
  appointment?: any;
  studioName?: string;
  studioAddress?: string;
  artistName?: string;
}

export default function ConsentDocumentModal({
  isOpen,
  onClose,
  consent,
  appointment,
  studioName = 'Tatoo Studio Atelier',
  studioAddress = 'Calle del Arte 12, Madrid',
  artistName = 'Artista Tatuador'
}: ConsentDocumentModalProps) {
  if (!isOpen || !consent) return null;

  const handlePrint = () => {
    window.print();
  };

  const signedDateFormatted = consent.signed_at
    ? new Date(consent.signed_at).toLocaleString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Fecha no registrada';

  const docId = consent.id ? consent.id.slice(0, 8).toUpperCase() : 'DOC-REG';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div id="consent-printable-document" className="bg-ink-950 border border-white/20 rounded-3xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl relative my-auto print:border-none print:shadow-none print:p-8 print:bg-white print:text-black">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10 print:hidden">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Documento Oficial de Consentimiento Informado Legal</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Descargar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE LEGAL DOCUMENT CONTAINER */}
        <div className="space-y-6 text-ink-200 print:text-black text-xs leading-relaxed font-sans">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10 print:border-black">
            <div>
              <div className="text-xl font-bold font-display text-white print:text-black tracking-wide uppercase">
                {studioName}
              </div>
              <div className="text-[11px] text-ink-400 print:text-gray-600 mt-1 space-y-0.5 font-mono">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-crimson-500 print:text-black" />
                  <span>{studioAddress}</span>
                </div>
                <div>Tatuador responsable: <strong className="text-ink-100 print:text-black">{artistName}</strong></div>
              </div>
            </div>

            <div className="text-right sm:text-right font-mono text-[10px] bg-white/5 print:bg-gray-100 p-2.5 rounded-xl border border-white/10 print:border-gray-300">
              <div className="font-bold text-amber-400 print:text-black">REF: CONSENT-{docId}</div>
              <div className="text-ink-400 print:text-gray-600 mt-0.5">{signedDateFormatted}</div>
              <div className="text-emerald-400 print:text-black font-semibold mt-0.5">✓ VÁLIDO Y CERTIFICADO</div>
            </div>
          </div>

          <h2 className="text-center font-bold text-base text-white print:text-black tracking-wide uppercase py-1">
            Consentimiento Informado para la Realización de Tatuajes
          </h2>

          {/* Section 1: Client Personal Identification */}
          <div className="bg-ink-900/60 print:bg-gray-50 p-4 rounded-2xl border border-white/5 print:border-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] uppercase font-mono text-ink-400 print:text-gray-500 font-bold">Cliente / Firmante</span>
              <span className="font-bold text-sm text-white print:text-black">{consent.full_name || 'Nombre no registrado'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-mono text-ink-400 print:text-gray-500 font-bold">DNI / NIE / Pasaporte</span>
              <span className="font-mono font-bold text-sm text-amber-300 print:text-black">{consent.dni_nie || 'DNI no registrado'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-mono text-ink-400 print:text-gray-500 font-bold">Dirección IP de Firma</span>
              <span className="font-mono text-[11px] text-ink-300 print:text-gray-700">{consent.signer_ip || '127.0.0.1'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-mono text-ink-400 print:text-gray-500 font-bold">Dispositivo / User-Agent</span>
              <span className="font-mono text-[10px] text-ink-400 print:text-gray-600 truncate block max-w-xs">{consent.signer_user_agent || 'Navegador Web'}</span>
            </div>
          </div>

          {/* Section 2: Declarations and Legal Clauses */}
          <div className="space-y-2.5 text-[11px] text-ink-300 print:text-gray-800 leading-relaxed text-justify">
            <p>
              <strong>1. Mayoría de edad y voluntariedad:</strong> El/la cliente declara bajo su responsabilidad ser mayor de 18 años, encontrarse en pleno uso de sus facultades físicas y mentales, no estar bajo la influencia de alcohol, drogas o estupefacientes, y solicitar de manera libre y voluntaria la realización del procedimiento de tatuaje.
            </p>
            <p>
              <strong>2. Riesgos inherentes y permanencia:</strong> Se informa de que el tatuaje es una técnica invasiva de micropigmentación dérmica permanente. Se han explicado los posibles riesgos inherentes, incluidos dolor, inflamación, enrojecimiento temporal, posible alergia a pigmentos y riesgo de infección si no se observan estrictamente las instrucciones de higiene.
            </p>
            <p>
              <strong>3. Información sanitaria y estado de salud:</strong> El/la firmante manifiesta no padecer enfermedades infectocontagiosas activas, hemofilia, afecciones cutáneas en la zona a tatuar, diabetes no controlada ni encontrarse en estado de gestación o lactancia, habiendo comunicado con veracidad su estado médico.
            </p>
            <p>
              <strong>4. Compromiso de cuidados posteriores:</strong> El/la cliente se compromete a seguir rigurosamente las pautas sanitarias de lavado con jabón neutro, hidratación con pomada específica, protección solar y evitación de inmersión en agua (piscinas/mar) durante el periodo de cicatrización (20-30 días).
            </p>
          </div>

          {/* Section 3: Medical Questionnaire Responses */}
          {consent.medical_disclaimers && (
            <div className="border border-white/10 print:border-gray-300 rounded-2xl p-3.5 bg-black/30 print:bg-white text-[11px]">
              <div className="font-bold text-white print:text-black mb-2 uppercase text-[10px] font-mono">
                Cuestionario Sanitario Declarado por el Cliente:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-ink-300 print:text-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                  <span>Alergias a metales o tintas: <strong>{consent.medical_disclaimers.allergies === 'yes' ? 'Sí (comunicadas)' : 'No'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                  <span>Medicación anticoagulante: <strong>{consent.medical_disclaimers.medications === 'yes' ? 'Sí' : 'No'}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Verified Signature Box */}
          <div className="pt-4 border-t border-white/10 print:border-black flex flex-col sm:flex-row justify-between items-end gap-6">
            <div className="text-[10px] text-ink-400 print:text-gray-600 max-w-sm">
              Documento firmado electrónicamente con valor probatorio conforme a la Ley de Servicios de la Sociedad de la Información y firma digital. Custodiado por {studioName}.
            </div>

            <div className="text-center w-full sm:w-64">
              <span className="block text-[10px] font-mono font-bold text-ink-400 print:text-gray-600 uppercase mb-1">
                Firma Digital del Cliente:
              </span>
              <div className="bg-white p-2 rounded-xl border border-white/20 print:border-black inline-block w-full h-24 flex items-center justify-center overflow-hidden">
                {consent.signature_data_url ? (
                  <img
                    src={consent.signature_data_url}
                    alt={`Firma de ${consent.full_name}`}
                    className="max-h-full max-w-full object-contain filter invert print:filter-none"
                  />
                ) : (
                  <span className="text-gray-400 text-xs italic">Firma estampada</span>
                )}
              </div>
              <span className="block text-[10px] text-ink-400 print:text-gray-700 font-mono mt-1">
                {consent.full_name} · {consent.dni_nie}
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-8 pt-4 border-t border-white/10 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Descargar / Imprimir Documento (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
