import { jsPDF } from 'jspdf';
import { RagRecommendationResponse, RagRecommendation, Member } from '../types';

export const generateInterventionPdf = (
  ragData: RagRecommendationResponse,
  member?: Member | null
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 45;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 45) {
      doc.addPage();
      y = 45;
      // Header on continuation pages
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`CareRiskPulse \u2022 Clinical & SDOH Intervention Report \u2022 Member: ${ragData.member_id}`, margin, y);
      y += 20;
    }
  };

  // ============================================================
  // HEADER BANNER
  // ============================================================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 55, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(45, 212, 191); // teal-400
  doc.text('CareRiskPulse', margin + 16, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(241, 245, 249); // slate-100
  doc.text('Clinical & SDOH Intervention Report', margin + 16, y + 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  doc.text(`Date: ${dateStr}`, pageWidth - margin - 80, y + 32);

  y += 70;

  // ============================================================
  // MEMBER RISK SUMMARY BOX
  // ============================================================
  const score = ragData.risk_summary?.risk_score ?? member?.riskSummary?.overallRiskScore ?? 0;
  const category = ragData.risk_summary?.risk_category ?? member?.riskSummary?.riskLevel ?? 'N/A';
  const fips = member?.countyFips || 'N/A';

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(margin, y, contentWidth, 52, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(`Member ID: ${ragData.member_id}`, margin + 14, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.text(`Risk Score: ${Number(score).toFixed(1)} / 100`, margin + 160, y + 20);
  doc.text(`Risk Category: ${category}`, margin + 300, y + 20);
  if (fips !== 'N/A') {
    doc.text(`County FIPS: ${fips}`, margin + 440, y + 20);
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Grounding Source: FAISS Evidence Retrieval & Gemini Clinical Reasoning Engine', margin + 14, y + 40);

  y += 66;

  // ============================================================
  // RISK OVERVIEW SECTION
  // ============================================================
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Risk Overview', margin, y);
  y += 14;

  const overviewText = ragData.risk_summary?.summary || 
    `The member has an overall risk score of ${Number(score).toFixed(1)} and is categorized in the ${category} risk tier. The following evidence-grounded clinical and social interventions have been formulated using medical guidelines and social determinants of health indices.`;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const overviewLines = doc.splitTextToSize(overviewText, contentWidth);
  doc.text(overviewLines, margin, y);
  y += overviewLines.length * 12 + 16;

  // ============================================================
  // RECOMMENDED INTERVENTIONS LIST
  // ============================================================
  const recommendations: RagRecommendation[] = ragData.recommendations || [];

  if (recommendations.length === 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No active intervention recommendations are currently available for this member.', margin, y);
    y += 20;
  } else {
    recommendations.forEach((rec, idx) => {
      checkPageBreak(120);

      // Card Box Header
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 24, 'FD');

      const title = rec.concept || rec.title || `Intervention ${idx + 1}`;
      const priority = (rec.priority || 'Standard').toUpperCase();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${title}`, margin + 10, y + 16);

      doc.setFontSize(8.5);
      if (priority === 'HIGH' || priority === 'URGENT') {
        doc.setTextColor(190, 18, 60); // rose-700
      } else if (priority === 'MEDIUM') {
        doc.setTextColor(180, 83, 9); // amber-700
      } else {
        doc.setTextColor(4, 120, 87); // emerald-700
      }
      doc.text(`[Priority: ${priority}]`, pageWidth - margin - 85, y + 16);

      y += 34;

      // Metadata: Driver & SHAP
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      if (rec.feature) {
        doc.text(`Target Risk Driver: ${rec.feature}`, margin + 10, y);
      }
      if (rec.shap_impact !== undefined) {
        const sign = rec.shap_impact > 0 ? '+' : '';
        doc.text(`SHAP Impact: ${sign}${rec.shap_impact.toFixed(2)}`, margin + 260, y);
      }
      if (rec.domain) {
        doc.text(`Domain: ${rec.domain.replace(/_/g, ' ')}`, margin + 390, y);
      }
      y += 14;

      // Rationale
      const rationale = rec.rationale || rec.description;
      if (rationale) {
        checkPageBreak(40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text('Why this is recommended:', margin + 10, y);
        y += 11;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const rLines = doc.splitTextToSize(rationale, contentWidth - 20);
        doc.text(rLines, margin + 10, y);
        y += rLines.length * 11 + 6;
      }

      // Recommended Action
      const action = rec.recommended_action || rec.action_required;
      if (action) {
        checkPageBreak(35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(13, 148, 136); // teal-600
        doc.text('Recommended Action Plan:', margin + 10, y);
        y += 11;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const aLines = doc.splitTextToSize(action, contentWidth - 20);
        doc.text(aLines, margin + 10, y);
        y += aLines.length * 11 + 6;
      }

      // Next Step
      if (rec.next_step) {
        checkPageBreak(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9); // amber-700
        doc.text('Next Step:', margin + 10, y);
        y += 11;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const nLines = doc.splitTextToSize(rec.next_step, contentWidth - 20);
        doc.text(nLines, margin + 10, y);
        y += nLines.length * 11 + 6;
      }

      // Supporting Evidence (FAISS)
      if (rec.evidence_sources && rec.evidence_sources.length > 0) {
        checkPageBreak(35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('Supporting Clinical & SDOH Evidence (FAISS Citations):', margin + 10, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        rec.evidence_sources.forEach((src) => {
          checkPageBreak(12);
          const scoreText = src.score !== undefined ? ` (Relevance: ${(src.score * 100).toFixed(0)}%)` : '';
          const line = `\u2022 ${src.source} \u2014 Doc: ${src.document || src.chunk_id}${scoreText}`;
          doc.text(line, margin + 16, y);
          y += 10;
        });
        y += 4;
      }

      y += 12; // Gap between recommendations
    });
  }

  // ============================================================
  // FOOTER DISCLAIMER
  // ============================================================
  checkPageBreak(30);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Confidential Healthcare Analytics Report \u2022 Generated by CareRiskPulse Clinical Decision Support System. Not a substitute for professional clinical judgment.',
    margin,
    y
  );

  // Save PDF
  const cleanId = String(ragData.member_id).replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanId}_Intervention_Report.pdf`);
};
