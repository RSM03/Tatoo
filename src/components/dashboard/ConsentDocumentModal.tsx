'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';
import { ensureDarkInkSignature } from '@/lib/signature';

interface ConsentDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  consent: any;
  appointment?: any;
  studioName?: string;
  studioAddress?: string;
  artistName?: string;
}

function escapeHtml(str: string = ''): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  const [mounted, setMounted] = useState(false);
  const [processedSignature, setProcessedSignature] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and apply print isolation class when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('consent-modal-open');
    } else {
      document.body.classList.remove('consent-modal-open');
    }
    return () => {
      document.body.classList.remove('consent-modal-open');
    };
  }, [isOpen]);

  // Ensure signature uses dark ink (#0f172a) for crisp paper rendering
  useEffect(() => {
    let isCurrent = true;
    if (consent?.signature_data_url) {
      ensureDarkInkSignature(consent.signature_data_url).then((darkUrl) => {
        if (isCurrent) setProcessedSignature(darkUrl);
      });
    } else {
      setProcessedSignature('');
    }
    return () => {
      isCurrent = false;
    };
  }, [consent?.signature_data_url]);

  if (!isOpen || !consent || !mounted) return null;

  const displaySignature = processedSignature || consent.signature_data_url || '';

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

  // Dedicated clean iframe printing: isolates document from dashboard DOM completely,
  // guaranteeing the document prints directly on Page 1 without any prior blank pages.
  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const signatureImgTag = displaySignature
      ? `<img src="${displaySignature}" alt="Firma del Cliente" style="max-height: 80px; max-width: 220px; object-fit: contain; display: block; margin: 0 auto;" />`
      : `<span style="font-size: 11px; color: #64748b; font-style: italic;">Firma digital estampada</span>`;

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Consentimiento Informado - ${escapeHtml(consent.full_name || 'Cliente')}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 14mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.45;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .doc-container {
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 12px;
            border-bottom: 2px solid #0f172a;
            margin-bottom: 12px;
          }
          .studio-title {
            font-size: 17px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .studio-info {
            font-size: 10px;
            color: #475569;
            margin-top: 3px;
            line-height: 1.35;
          }
          .ref-box {
            text-align: right;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 9.5px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 10px;
          }
          .ref-code {
            font-weight: 700;
            color: #0f172a;
          }
          .ref-badge {
            color: #059669;
            font-weight: 700;
            margin-top: 2px;
          }
          .doc-title {
            text-align: center;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            color: #0f172a;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 9px 12px;
            margin-bottom: 12px;
          }
          .info-label {
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          .info-value {
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
          }
          .clauses {
            margin-bottom: 10px;
          }
          .clause-p {
            margin-bottom: 6px;
            font-size: 9.8px;
            line-height: 1.42;
            text-align: justify;
            color: #334155;
          }
          .clause-p strong {
            color: #0f172a;
          }
          .medical-box {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 7px 12px;
            background: #f8fafc;
            margin-bottom: 12px;
            font-size: 9.5px;
          }
          .medical-title {
            font-weight: 700;
            font-size: 9px;
            text-transform: uppercase;
            color: #0f172a;
            margin-bottom: 4px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          .medical-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            color: #334155;
          }
          .footer-section {
            border-top: 1.5px solid #0f172a;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
          }
          .legal-notice {
            font-size: 8.8px;
            color: #64748b;
            max-width: 380px;
            line-height: 1.35;
          }
          .signature-box {
            width: 230px;
            text-align: center;
          }
          .sig-label {
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            color: #475569;
            margin-bottom: 4px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          .sig-img-wrap {
            height: 85px;
            border: 1px solid #0f172a;
            border-radius: 6px;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
          }
          .sig-client-name {
            font-size: 9px;
            color: #334155;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            margin-top: 3px;
          }
        </style>
      </head>
      <body>
        <div class="doc-container">
          <div class="header">
            <div>
              <div class="studio-title">${escapeHtml(studioName)}</div>
              <div class="studio-info">
                <div>📍 ${escapeHtml(studioAddress)}</div>
                <div>Tatuador responsable: <strong>${escapeHtml(artistName)}</strong></div>
              </div>
            </div>
            <div class="ref-box">
              <div class="ref-code">REF: CONSENT-${docId}</div>
              <div style="color: #64748b; margin-top: 2px;">${signedDateFormatted}</div>
              <div class="ref-badge">✓ VÁLIDO Y CERTIFICADO</div>
            </div>
          </div>

          <div class="doc-title">Consentimiento Informado para la Realización de Tatuajes</div>

          <div class="info-grid">
            <div>
              <div class="info-label">Cliente / Firmante</div>
              <div class="info-value">${escapeHtml(consent.full_name || 'Nombre no registrado')}</div>
            </div>
            <div>
              <div class="info-label">DNI / NIE / Pasaporte</div>
              <div class="info-value">${escapeHtml(consent.dni_nie || 'No registrado')}</div>
            </div>
            <div>
              <div class="info-label">Dirección IP de Firma</div>
              <div style="font-family: monospace; font-size: 10px; color: #475569;">${escapeHtml(consent.signer_ip || '127.0.0.1')}</div>
            </div>
            <div>
              <div class="info-label">Dispositivo / User-Agent</div>
              <div style="font-family: monospace; font-size: 8.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${escapeHtml(consent.signer_user_agent || 'Navegador Web')}</div>
            </div>
          </div>

          <div class="clauses">
            <p class="clause-p"><strong>1. Mayoría de edad y voluntariedad:</strong> El/la cliente declara bajo su responsabilidad ser mayor de 18 años, encontrarse en pleno uso de sus facultades físicas y mentales, no estar bajo la influencia de alcohol, drogas o estupefacientes, y solicitar de manera libre y voluntaria la realización del procedimiento de tatuaje.</p>
            <p class="clause-p"><strong>2. Riesgos inherentes y permanencia:</strong> Se informa de que el tatuaje es una técnica invasiva de micropigmentación dérmica permanente. Se han explicado los posibles riesgos inherentes, incluidos dolor, inflamación, enrojecimiento temporal, posible alergia a pigmentos y riesgo de infección si no se observan estrictamente las instrucciones de higiene.</p>
            <p class="clause-p"><strong>3. Información sanitaria y estado de salud:</strong> El/la firmante manifiesta no padecer enfermedades infectocontagiosas activas, hemofilia, afecciones cutáneas en la zona a tatuar, diabetes no controlada ni encontrarse en estado de gestación o lactancia, habiendo comunicado con veracidad su estado médico.</p>
            <p class="clause-p"><strong>4. Compromiso de cuidados posteriores:</strong> El/la cliente se compromete a seguir rigurosamente las pautas sanitarias de lavado con jabón neutro, hidratación con pomada específica, protección solar y evitación de inmersión en agua (piscinas/mar) durante el periodo de cicatrización (20-30 días).</p>
          </div>

          ${consent.medical_disclaimers ? `
            <div class="medical-box">
              <div class="medical-title">Cuestionario Sanitario Declarado por el Cliente:</div>
              <div class="medical-grid">
                <div>✓ Alergias a metales o tintas: <strong>${consent.medical_disclaimers.allergies === 'yes' ? 'Sí (comunicadas)' : 'No'}</strong></div>
                <div>✓ Medicación anticoagulante: <strong>${consent.medical_disclaimers.medications === 'yes' ? 'Sí' : 'No'}</strong></div>
              </div>
            </div>
          ` : ''}

          <div class="footer-section">
            <div class="legal-notice">
              Documento firmado electrónicamente con valor probatorio conforme a la Ley de Servicios de la Sociedad de la Información y firma digital. Custodiado por ${escapeHtml(studioName)}.
            </div>
            <div class="signature-box">
              <div class="sig-label">Firma Digital del Cliente:</div>
              <div class="sig-img-wrap">
                ${signatureImgTag}
              </div>
              <div class="sig-client-name">
                ${escapeHtml(consent.full_name || '')} · ${escapeHtml(consent.dni_nie || '')}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    // Trigger print once iframe resources are rendered
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {
          // ignore if already removed
        }
      }, 1500);
    }, 200);
  };

  const modalContent = (
    <div id="consent-modal-root">
      <div
        id="consent-modal-overlay"
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible"
      >
        <div
          id="consent-printable-document"
          className="bg-ink-950 border border-white/20 rounded-3xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl relative my-auto print:border-none print:shadow-none print:p-6 print:bg-white print:text-black"
        >
          {/* Modal Header Controls (Hidden during print) */}
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

          {/* Printable Document Body */}
          <div className="space-y-5 text-ink-200 print:text-black text-xs leading-relaxed font-sans">
            {/* Studio Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-white/10 print:border-black">
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

              <div className="text-right font-mono text-[10px] bg-white/5 print:bg-gray-100 p-2.5 rounded-xl border border-white/10 print:border-gray-300">
                <div className="font-bold text-amber-400 print:text-black">REF: CONSENT-{docId}</div>
                <div className="text-ink-400 print:text-gray-600 mt-0.5">{signedDateFormatted}</div>
                <div className="text-emerald-400 print:text-black font-semibold mt-0.5">✓ VÁLIDO Y CERTIFICADO</div>
              </div>
            </div>

            <h2 className="text-center font-bold text-sm sm:text-base text-white print:text-black tracking-wide uppercase py-0.5">
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
            <div className="space-y-2 text-[11px] text-ink-300 print:text-gray-800 leading-relaxed text-justify">
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
              <div className="border border-white/10 print:border-gray-300 rounded-2xl p-3 bg-black/30 print:bg-white text-[11px]">
                <div className="font-bold text-white print:text-black mb-1.5 uppercase text-[10px] font-mono">
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
            <div className="pt-3 border-t border-white/10 print:border-black flex flex-col sm:flex-row justify-between items-end gap-6">
              <div className="text-[10px] text-ink-400 print:text-gray-600 max-w-sm">
                Documento firmado electrónicamente con valor probatorio conforme a la Ley de Servicios de la Sociedad de la Información y firma digital. Custodiado por {studioName}.
              </div>

              <div className="text-center w-full sm:w-64">
                <span className="block text-[10px] font-mono font-bold text-ink-400 print:text-gray-600 uppercase mb-1">
                  Firma Digital del Cliente:
                </span>
                <div className="bg-white p-2 rounded-xl border border-gray-300 print:border-black inline-block w-full h-24 flex items-center justify-center overflow-hidden">
                  {displaySignature ? (
                    <img
                      src={displaySignature}
                      alt={`Firma de ${consent.full_name}`}
                      className="max-h-full max-w-full object-contain"
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
    </div>
  );

  return createPortal(modalContent, document.body);
}
