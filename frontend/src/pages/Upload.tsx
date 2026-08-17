import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight, 
  FileCheck, 
  RotateCcw, 
  Sparkles, 
  Download,
  Database,
  Layers,
  HelpCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { apiService } from '../services/api';
import { UploadResponse } from '../types';

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Upload & Processing state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Frontend File Validation
  const validateAndSetFile = (file: File) => {
    setValidationError(null);
    setUploadResult(null);

    // 1. Check extension and type
    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';

    if (!isCsv) {
      setValidationError(`Unsupported file format "${file.name}". Please upload a standard comma-separated (.csv) file.`);
      setSelectedFile(null);
      return;
    }

    // 2. Check for empty file
    if (file.size === 0) {
      setValidationError('The selected file is empty (0 bytes). Please choose a valid population health CSV with member records.');
      setSelectedFile(null);
      return;
    }

    // 3. Max size limit (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setValidationError('File exceeds the 50MB batch upload threshold. Please provide a smaller cohort file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // File Input Change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearSelected = () => {
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Execute Upload Workflow
  const handleUpload = async () => {
    if (!selectedFile) {
      setValidationError('Please select or drop a valid .csv file to upload.');
      return;
    }

    setIsUploading(true);
    setValidationError(null);
    setUploadProgress(15);
    setProgressStage('Validating CSV column headers & schema integrity...');

    try {
      // Step 1: Client validation delay
      await new Promise(r => setTimeout(r, 250));
      setUploadProgress(45);
      setProgressStage('Streaming dataset payload to API ingestion endpoint...');

      // Step 2: Ingestion simulation
      await new Promise(r => setTimeout(r, 300));
      setUploadProgress(80);
      setProgressStage('Buffering batch records & registering pipeline job...');

      // Call API Service Layer
      const result = await apiService.uploadCsv(selectedFile, {
        simulateError: simulateFailure,
      });

      setUploadProgress(100);
      setProgressStage('Ingestion successfully completed!');
      setUploadResult(result);
    } catch (err: any) {
      setValidationError(err?.message || 'An unexpected ingestion failure occurred. Please verify your file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const sampleContent = `member_id,first_name,last_name,age,gender,primary_condition,systolic_bp,diastolic_bp,heart_rate,hba1c,admissions_past_12m,ed_visits_past_12m,active_medications
MBR-901,Arthur,Pendleton,68,Male,COPD,146,88,76,7.8,1,2,6
MBR-902,Eleanor,Vance,72,Female,Type 2 Diabetes,158,94,88,9.2,2,3,9
MBR-903,Rosa,Martinez,59,Female,Hypertension,138,82,72,7.1,0,1,3
MBR-904,Julian,Ortiz,53,Male,Asthma,142,86,79,6.9,0,0,4
MBR-905,Beatrice,Sterling,81,Female,Atrial Fibrillation,162,98,92,8.8,3,4,11`;

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'synthetic_member_cohort_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Member Cohort Data Ingestion
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-mono font-bold">
              POST /upload
            </span>
          </div>
          <p className="text-xs lg:text-sm text-slate-400 mt-1.5 max-w-2xl">
            Upload raw patient rosters, clinical telemetry, and claims history for population risk scoring ingestion.
          </p>
        </div>

        <button
          onClick={handleDownloadSampleCsv}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-700 text-xs font-semibold transition-all shadow-sm shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 text-teal-400" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {/* Integration Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-start gap-3.5 text-xs text-slate-300">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300">
            FastAPI Pipeline Integration Gateway
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            This module validates and buffers member datasets through the API service layer. All 54-feature engineering, SHAP feature attribution weights, and risk models are processed downstream by the backend FastAPI prediction pipeline.
          </p>
        </div>
      </div>

      {/* Main Upload Card */}
      {!uploadResult ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl space-y-6">
          {/* Drag & Drop Surface */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 lg:p-12 text-center transition-all cursor-pointer relative ${
              isDragOver
                ? 'border-teal-400 bg-teal-500/10 shadow-lg shadow-teal-500/10 scale-[1.01]'
                : selectedFile
                ? 'border-teal-500/50 bg-slate-950/60'
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-md ${
                selectedFile 
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {selectedFile ? (
                  <FileCheck className="w-8 h-8 text-teal-400 animate-bounce" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-teal-400" />
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedFile ? 'Selected File Ready for Ingestion' : 'Drag & Drop your Member Cohort CSV here'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  or <span className="text-teal-400 font-semibold underline underline-offset-2">browse computer files</span> (.csv format only)
                </p>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-slate-400" /> Max 50MB
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" /> UTF-8 Comma-Separated
                </span>
              </div>
            </div>
          </div>

          {/* Validation Error Alert */}
          {validationError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-3 text-xs text-rose-300 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-200">Validation Error</p>
                  <p className="text-rose-300/90 mt-0.5">{validationError}</p>
                </div>
              </div>
              <button
                onClick={() => setValidationError(null)}
                className="text-rose-400 hover:text-rose-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Selected File Details Bar */}
          {selectedFile && !isUploading && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-400">
                    Size: <span className="font-mono text-slate-300 font-semibold">{formatFileSize(selectedFile.size)}</span> &bull; Last Modified: {new Date(selectedFile.lastModified).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  Change File
                </button>
                <button
                  type="button"
                  onClick={handleClearSelected}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Remove selected file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-5 rounded-xl bg-slate-950/80 border border-teal-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-teal-400" />
                  {progressStage}
                </span>
                <span className="font-mono font-bold text-white">{uploadProgress}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-300 shadow-sm shadow-teal-500/50"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Please keep this window open while the dataset is buffered for backend pipeline ingestion.
              </p>
            </div>
          )}

          {/* Controls Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
            {/* Testing Option: Simulate Ingestion Failure */}
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500/50"
              />
              <span>Simulate schema validation failure (Testing mode)</span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {selectedFile && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleClearSelected}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                disabled={!selectedFile || isUploading}
                onClick={handleUpload}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isUploading ? (
                  <span>Ingesting Dataset...</span>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload &amp; Ingest Dataset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Successful Ingestion View */
        <div className="bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-6 lg:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Dataset Successfully Ingested
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    {uploadResult.status}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{uploadResult.message}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setUploadResult(null);
                setSelectedFile(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Upload Another</span>
            </button>
          </div>

          {/* Ingestion Receipt Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Ingested File</span>
              <span className="text-sm font-bold text-white truncate block mt-1">{uploadResult.filename}</span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">{formatFileSize(uploadResult.fileSizeBytes)}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Identified Records</span>
              <span className="text-2xl font-bold font-mono text-emerald-400 block mt-0.5">{uploadResult.recordsCount.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 block">Validated member rows</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Batch Ticket</span>
              <span className="text-xs font-mono font-bold text-teal-300 block mt-1 truncate">{uploadResult.batchId}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(uploadResult.uploadedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Model Pipeline</span>
              <span className="text-xs font-bold text-teal-400 block mt-1">Pending FastAPI Execution</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">POST /upload Endpoint Binding</span>
            </div>
          </div>

          {/* Detected Columns Pills */}
          {uploadResult.detectedHeaders && uploadResult.detectedHeaders.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                Detected Feature Columns ({uploadResult.detectedHeaders.length}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {uploadResult.detectedHeaders.map((col, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-900 text-teal-300 border border-teal-500/20"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps CTA Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Link
              to="/members"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all"
            >
              <span>View Member Population</span>
            </Link>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all group cursor-pointer"
            >
              <span>Continue to Overview</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Expected CSV Schema Documentation Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <HelpCircle className="w-4 h-4 text-teal-400" />
          <span>Expected CSV Dataset Schema Guidelines</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                <th className="py-2.5 px-3">Column Name</th>
                <th className="py-2.5 px-3">Data Type</th>
                <th className="py-2.5 px-3">Required</th>
                <th className="py-2.5 px-3">Sample Value</th>
                <th className="py-2.5 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2 px-3 font-mono text-teal-300 font-semibold">member_id</td>
                <td className="py-2 px-3 font-mono text-slate-400">String</td>
                <td className="py-2 px-3"><span className="text-emerald-400 font-bold">Yes</span></td>
                <td className="py-2 px-3 font-mono">MBR-98241</td>
                <td className="py-2 px-3 text-slate-400">Unique alphanumeric member / patient identifier</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-teal-300 font-semibold">age / gender</td>
                <td className="py-2 px-3 font-mono text-slate-400">Integer / Text</td>
                <td className="py-2 px-3"><span className="text-emerald-400 font-bold">Yes</span></td>
                <td className="py-2 px-3 font-mono">72, Female</td>
                <td className="py-2 px-3 text-slate-400">Standard demographic stratification factors</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-teal-300 font-semibold">systolic_bp / hba1c</td>
                <td className="py-2 px-3 font-mono text-slate-400">Numeric</td>
                <td className="py-2 px-3"><span className="text-slate-400">Optional</span></td>
                <td className="py-2 px-3 font-mono">158, 9.2</td>
                <td className="py-2 px-3 text-slate-400">Clinical vitals &amp; laboratory biomarkers</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-teal-300 font-semibold">primary_condition</td>
                <td className="py-2 px-3 font-mono text-slate-400">String</td>
                <td className="py-2 px-3"><span className="text-emerald-400 font-bold">Yes</span></td>
                <td className="py-2 px-3 font-mono">Type 2 Diabetes</td>
                <td className="py-2 px-3 text-slate-400">Principal chronic condition or ICD-10 diagnosis</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-teal-300 font-semibold">admissions_past_12m</td>
                <td className="py-2 px-3 font-mono text-slate-400">Integer</td>
                <td className="py-2 px-3"><span className="text-slate-400">Optional</span></td>
                <td className="py-2 px-3 font-mono">2</td>
                <td className="py-2 px-3 text-slate-400">Prior healthcare utilization &amp; inpatient encounter history</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Upload;
