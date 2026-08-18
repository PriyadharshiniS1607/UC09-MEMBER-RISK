import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight, 
  FileCheck, 
  RotateCcw, 
  Sparkles, 
  Download,
  Cpu,
  Check,
  Table as TableIcon
} from 'lucide-react';
import { apiService } from '../services/api';
import { UploadCsvResponse } from '../types';

export const Upload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Parsed CSV summary state before execution
  const [csvPreviewHeaders, setCsvPreviewHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [csvRowCount, setCsvRowCount] = useState<number>(0);

  // Upload execution state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<UploadCsvResponse | null>(null);

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Validate and parse selected CSV
  const validateAndSetFile = async (file: File) => {
    setValidationError(null);
    setUploadResult(null);
    setCsvPreviewHeaders([]);
    setCsvPreviewRows([]);
    setCsvRowCount(0);

    const isCsvExtension = file.name.toLowerCase().endsWith('.csv');
    if (!isCsvExtension) {
      setValidationError(`Unsupported file format "${file.name}". Only standard comma-separated (.csv) files are permitted.`);
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setValidationError('The selected file is empty (0 bytes). Please choose a valid population dataset.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setValidationError('File exceeds the 15 MB upload limit. Please provide a cohort batch under 15 MB.');
      setSelectedFile(null);
      return;
    }

    try {
      const text = await file.slice(0, 100000).text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const rows = lines.slice(1, 6).map(row => row.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, '')));
        setCsvPreviewHeaders(headers);
        setCsvPreviewRows(rows);

        // Approximate full row count
        const totalLines = text.split(/\r?\n/).length - 1;
        setCsvRowCount(totalLines > 0 ? totalLines : rows.length);
      }
    } catch (e) {
      console.warn('Could not parse CSV preview client-side:', e);
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

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
    setCsvPreviewHeaders([]);
    setCsvPreviewRows([]);
    setCsvRowCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Execute Real Prediction Pipeline
  const handleUpload = async () => {
    if (!selectedFile) {
      setValidationError('Please select or drop a .csv file to upload.');
      return;
    }

    setIsUploading(true);
    setValidationError(null);
    setUploadProgress(20);
    setProgressStage('Uploading dataset to prediction service...');

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 40) return prev + 10;
        if (prev < 70) {
          setProgressStage('Running ML Stacking Ensemble (CatBoost, LightGBM, XGBoost, Meta-Model)...');
          return prev + 5;
        }
        if (prev < 90) {
          setProgressStage('Computing SHAP TreeExplainer feature attributions and saving cohort...');
          return prev + 2;
        }
        return prev;
      });
    }, 500);

    try {
      const result = await apiService.uploadMemberCsv(selectedFile);
      clearInterval(progressTimer);

      setUploadProgress(100);
      setProgressStage('Prediction and persistence completed successfully.');
      setUploadResult(result);
    } catch (err: any) {
      clearInterval(progressTimer);
      console.error('Upload error:', err);
      let errMsg = 'An unexpected prediction failure occurred.';

      if (err?.response?.status === 403) {
        errMsg = 'Permission Denied: The Payer Viewer role has read-only access. ML risk prediction requires Clinical Analyst, Care Manager, or Payer Administrator permissions.';
      } else if (err?.response?.status === 413) {
        errMsg = 'File Too Large: Upload exceeds the 15 MB / 50,000-row batch limit.';
      } else if (err?.response?.status === 400) {
        const detail = err.response.data?.detail;
        errMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      } else if (err?.message) {
        errMsg = err.message;
      }

      setValidationError(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // Sample CSV matching model training features
  const handleDownloadSampleCsv = () => {
    const sampleContent = `member_id,CountyFIPS,StateFIPS,age,gender,diabetes,hypertension,heart_disease,copd,obesity,cancer,chronic_condition_count,total_encounters,ed_visits,hospitalizations,medication_count,preventive_care_gap,EP_POV150,EP_UNEMP,EP_HBURD,EP_NOHSDP,EP_UNINSUR,EP_AGE65,EP_AGE17,EP_DISABL,EP_SNGPNT,EP_LIMENG,EP_MINRTY,EP_MUNIT,EP_MOBILE,EP_CROWD,EP_NOVEH,EP_GROUPQ,RPL_THEMES,DIABETES_AdjPrev,OBESITY_AdjPrev,CSMOKING_AdjPrev,LPA_AdjPrev,BPHIGH_AdjPrev,HIGHCHOL_AdjPrev,CHD_AdjPrev,STROKE_AdjPrev,COPD_AdjPrev,CASTHMA_AdjPrev,CANCER_AdjPrev,DEPRESSION_AdjPrev,MHLTH_AdjPrev,PHLTH_AdjPrev,GHLTH_AdjPrev,ARTHRITIS_AdjPrev,DISABILITY_AdjPrev,INDEPLIVE_AdjPrev,children_low_access_pct,no_vehicle_low_access_pct,low_income_low_access_pct,low_food_access_pct,seniors_low_access_pct
M00001,19139,19,69,Female,0,0,0,1,0,0,1,2,0,0,2,1,19.7,3.5,21.8,9.9,3.8,17.1,24.4,13.0,7.5,2.6,24.9,6.0,7.5,2.1,5.2,1.7,0.4792,10.3,41.4,16.2,28.1,31.0,29.6,5.6,2.9,6.2,9.8,7.0,20.1,18.0,12.7,18.9,23.3,28.3,7.6,45.3681,0.9959,5.5627,16.9952,47.7732
M00002,17031,17,74,Male,1,1,0,0,1,0,3,6,2,1,5,3,24.2,4.8,25.1,12.3,6.2,18.5,22.1,15.2,8.1,3.4,32.0,8.2,1.2,3.5,8.4,2.1,0.6820,12.1,38.2,18.4,30.2,38.5,35.2,7.1,3.8,8.1,10.2,8.4,22.3,19.1,14.5,22.0,26.1,32.4,8.9,52.1400,2.1500,8.4200,22.4000,51.2000
M00003,17031,17,81,Female,1,1,1,1,0,0,4,8,3,2,8,4,28.5,6.1,29.4,14.8,8.1,21.0,19.4,19.8,9.5,4.1,38.5,12.4,0.8,4.2,12.1,3.0,0.8450,14.5,43.1,21.0,34.5,42.1,38.9,9.4,5.1,11.2,12.4,9.8,26.4,23.2,17.8,27.1,31.2,39.5,11.4,62.8000,4.2000,12.8000,31.5000,59.4000`;

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'uc09_member_risk_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Data Ingestion
          </h1>
          <p className="text-xs lg:text-sm text-slate-400 mt-1 max-w-2xl">
            Upload member data and run risk prediction.
          </p>
        </div>

        <button
          onClick={handleDownloadSampleCsv}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-700 text-xs font-semibold transition-all shadow-sm shrink-0"
        >
          <Download className="w-4 h-4 text-teal-400" />
          <span>Download Sample Template</span>
        </button>
      </div>

      {/* Main Upload / Results Area */}
      {!uploadResult ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl space-y-6">
          {/* Drag & Drop Surface */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 lg:p-10 text-center transition-all cursor-pointer relative ${
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

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md ${
                selectedFile 
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {selectedFile ? (
                  <FileCheck className="w-7 h-7 text-teal-400" />
                ) : (
                  <UploadCloud className="w-7 h-7 text-teal-400" />
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">
                  {selectedFile ? selectedFile.name : 'Select or drag member cohort CSV'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Standard comma-separated format (.csv) up to 15 MB
                </p>
              </div>
            </div>
          </div>

          {/* Validation Error Alert */}
          {validationError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-3 text-xs text-rose-300 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-200">Validation Notice</p>
                  <p className="text-rose-300/90 mt-0.5 leading-relaxed">{validationError}</p>
                </div>
              </div>
              <button
                onClick={() => setValidationError(null)}
                className="text-rose-400 hover:text-rose-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Detected Dataset Attributes & Small Raw Preview */}
          {selectedFile && !isUploading && csvPreviewHeaders.length > 0 && (
            <div className="space-y-4 animate-in fade-in">
              {/* File Info Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">File Name</span>
                  <span className="font-bold text-white truncate block mt-0.5">{selectedFile.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">File Size</span>
                  <span className="font-mono font-bold text-slate-200 block mt-0.5">{formatFileSize(selectedFile.size)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Detected Columns</span>
                  <span className="font-mono font-bold text-teal-400 block mt-0.5">{csvPreviewHeaders.length} columns</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Estimated Records</span>
                  <span className="font-mono font-bold text-emerald-400 block mt-0.5">{csvRowCount > 0 ? csvRowCount.toLocaleString() : 'Ready'}</span>
                </div>
              </div>

              {/* Detected Feature Columns Pills */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Detected Features in Dataset ({csvPreviewHeaders.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {csvPreviewHeaders.map((header) => (
                    <span
                      key={header}
                      className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>

              {/* Small Raw Data Preview Table */}
              {csvPreviewRows.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <TableIcon className="w-3.5 h-3.5 text-teal-400" />
                    <span>Dataset Preview (First {csvPreviewRows.length} Rows):</span>
                  </div>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-left text-[11px] font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                          {csvPreviewHeaders.slice(0, 8).map((h) => (
                            <th key={h} className="py-1.5 px-2 font-bold">{h}</th>
                          ))}
                          {csvPreviewHeaders.length > 8 && <th className="py-1.5 px-2">...</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-slate-300">
                        {csvPreviewRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-900/40">
                            {row.slice(0, 8).map((val, cIdx) => (
                              <td key={cIdx} className="py-1 px-2 text-slate-300">{val}</td>
                            ))}
                            {row.length > 8 && <td className="py-1 px-2 text-slate-500">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress Bar (when executing) */}
          {isUploading && (
            <div className="p-5 rounded-xl bg-slate-950/80 border border-teal-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-teal-400" />
                  {progressStage}
                </span>
                <span className="font-mono font-bold text-white">{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-300 shadow-sm shadow-teal-500/50"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-500">
              Only standard CSV files containing a <code className="text-teal-400 font-mono">member_id</code> column will be processed.
            </div>

            <div className="flex items-center gap-3">
              {selectedFile && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleClearSelected}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                disabled={!selectedFile || isUploading}
                onClick={handleUpload}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <span>Running Prediction...</span>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>Run ML Risk Prediction</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Scored Results View */
        <div className="bg-slate-900/95 border border-emerald-500/30 rounded-2xl p-6 lg:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Prediction Completed &amp; Cohort Saved
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{uploadResult.message}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setUploadResult(null);
                setSelectedFile(null);
                setCsvPreviewHeaders([]);
                setCsvPreviewRows([]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Score Another File</span>
            </button>
          </div>

          {/* Results Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Dataset</span>
              <span className="font-bold text-white truncate block mt-0.5">{uploadResult.filename}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Scored Members</span>
              <span className="text-xl font-bold font-mono text-emerald-400 block mt-0.5">
                {uploadResult.recordsCount.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Batch Ref</span>
              <span className="text-xs font-mono font-bold text-teal-300 block mt-1 truncate">
                {uploadResult.batchId}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Status</span>
              <span className="text-xs font-bold text-emerald-400 block mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Database Synced
              </span>
            </div>
          </div>

          {/* Predictions Table Preview */}
          {uploadResult.predictions && uploadResult.predictions.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  Prediction Highlights (First {Math.min(uploadResult.predictions.length, 5)} Members):
                </span>
                <span className="text-slate-400 text-[11px]">
                  Total {uploadResult.predictions.length} predictions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase">
                      <th className="py-2 px-3">Member ID</th>
                      <th className="py-2 px-3">Risk Score</th>
                      <th className="py-2 px-3">Risk Tier</th>
                      <th className="py-2 px-3">Top SHAP Feature</th>
                      <th className="py-2 px-3">SHAP Value</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {uploadResult.predictions.slice(0, 5).map((pred) => {
                      const topDriver = pred.top_risk_drivers?.[0];
                      return (
                        <tr key={pred.prediction_id} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-300">{pred.member_id}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{pred.risk_score.toFixed(1)} / 100</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pred.risk_category === 'VERY HIGH' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                              pred.risk_category === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              pred.risk_category === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {pred.risk_category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{topDriver?.feature || 'N/A'}</td>
                          <td className="py-2.5 px-3 font-mono text-xs text-rose-300">
                            {topDriver ? (topDriver.shap_value > 0 ? `+${topDriver.shap_value.toFixed(2)}` : topDriver.shap_value.toFixed(2)) : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              to={`/members/${pred.member_id}`}
                              className="text-[11px] text-teal-400 hover:underline font-semibold"
                            >
                              View Profile &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Navigation CTAs */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Link
              to="/members"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all"
            >
              View Member Registry
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Go to Overview</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
