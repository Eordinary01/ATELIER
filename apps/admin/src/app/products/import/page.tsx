'use client';

import { useState } from 'react';
import { Header } from '../../../components/Header';
import { fetchAdminApi } from '../../../lib/api';
import { CsvValidationResult } from '@atelier/contract';

const SAMPLE_CSV = `title,categorySlug,collectionName,sku,size,colorName,colorHex,priceInr,stockQuantity,fabricSpecification,hsnCode,gstRate,imageUrl
Heavyweight Linen Shirt,shirts,Summer Archive,SHIRT-LINEN-WHT-S,S,White,#FFFFFF,2890,20,100% Belgian Linen,62052000,12,https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1200&q=80
Heavyweight Linen Shirt,shirts,Summer Archive,SHIRT-LINEN-WHT-M,M,White,#FFFFFF,2890,25,100% Belgian Linen,62052000,12,https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1200&q=80
Heavyweight Linen Shirt,shirts,Summer Archive,SHIRT-LINEN-WHT-L,L,White,#FFFFFF,2890,15,100% Belgian Linen,62052000,12,https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1200&q=80`;

export default function CsvImportPage() {
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleValidate = async () => {
    setIsValidating(true);
    setImportMessage(null);
    try {
      const json = await fetchAdminApi<CsvValidationResult>(
        '/api/v1/admin/products/csv-validate',
        {
          method: 'POST',
          body: JSON.stringify({ csvContent }),
        }
      );
      if (json.success && json.data) {
        setValidationResult(json.data);
      } else {
        alert(`Validation failed: ${json.error?.message || 'Check CSV format'}`);
      }
    } catch (err: any) {
      alert(`Validation failed: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.validRows === 0) return;
    setIsImporting(true);
    try {
      const json = await fetchAdminApi<{ importedCount: number }>(
        '/api/v1/admin/products/csv-import',
        {
          method: 'POST',
          body: JSON.stringify({ rows: validationResult.previewData }),
        }
      );
      if (json.success && json.data) {
        setImportMessage(`Successfully imported ${json.data.importedCount} product variants.`);
        setValidationResult(null);
      } else {
        alert(`Import failed: ${json.error?.message || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Header title="Batch CSV Ingestion" />
      <div className="p-8 space-y-6 max-w-7xl">
        <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif-headline text-base text-[#1B1C1A]">
                CSV Product Data Payload
              </h2>
              <p className="text-xs text-[#767872] mt-1">
                Paste comma-separated rows matching the strict Atelier schema.
              </p>
            </div>
            <button
              onClick={() => setCsvContent(SAMPLE_CSV)}
              className="text-[11px] font-mono text-[#767872] hover:text-[#1B1C1A] underline"
            >
              Reset to Sample Template
            </button>
          </div>

          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            rows={8}
            className="w-full p-4 border border-[#D6D3CA] rounded-[2px] font-mono text-xs bg-[#FAF9F6] text-[#1B1C1A] focus:outline-none focus:border-[#1B1C1A]"
          />

          <div className="flex items-center space-x-3">
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className="px-4 py-2 bg-[#1B1C1A] text-[#FAF9F6] text-xs uppercase tracking-wider rounded-[2px] hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {isValidating ? 'Validating Schema...' : 'Validate CSV Rows'}
            </button>
          </div>
        </div>

        {/* Validation Feedback & Preview */}
        {validationResult && (
          <div className="bg-white border border-[#E5E3DC] rounded-[4px] p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E3DC]">
              <div className="flex items-center space-x-6 text-xs font-mono">
                <div>
                  <span className="text-[#767872]">Total:</span>{' '}
                  <span className="font-semibold">{validationResult.totalRows}</span>
                </div>
                <div>
                  <span className="text-[#767872]">Valid:</span>{' '}
                  <span className="text-[#1B3B2B] font-semibold">{validationResult.validRows}</span>
                </div>
                <div>
                  <span className="text-[#767872]">Errors:</span>{' '}
                  <span className="text-[#7C1A22] font-semibold">{validationResult.errorRows}</span>
                </div>
              </div>

              {validationResult.validRows > 0 && (
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="px-4 py-2 bg-[#1B3B2B] text-white text-xs uppercase tracking-wider rounded-[2px] hover:bg-[#12271d] transition-colors disabled:opacity-50"
                >
                  {isImporting ? 'Ingesting...' : `Commit ${validationResult.validRows} Rows to Database`}
                </button>
              )}
            </div>

            {/* Error List */}
            {validationResult.errors.length > 0 && (
              <div className="p-4 bg-[#FFDAD6] border border-[#ffb4ab] rounded-[2px] text-xs text-[#93000A] space-y-1">
                <p className="font-semibold font-mono uppercase text-[10px]">Validation Issues Found:</p>
                {validationResult.errors.map((err, i) => (
                  <p key={i}>
                    Row {err.row}: <span className="font-mono">{err.field}</span> - {err.message}
                  </p>
                ))}
              </div>
            )}

            {/* Preview Table */}
            {validationResult.previewData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E3DC] bg-[#FAF9F6] text-[10px] font-mono uppercase text-[#767872]">
                      <th className="p-2">Title</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Size</th>
                      <th className="p-2">Color</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E3DC]">
                    {validationResult.previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF9F6]">
                        <td className="p-2 font-medium">{row.title}</td>
                        <td className="p-2 font-mono text-[11px]">{row.categorySlug}</td>
                        <td className="p-2 font-mono text-[11px]">{row.sku}</td>
                        <td className="p-2 font-mono text-[11px]">{row.size}</td>
                        <td className="p-2 flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: row.colorHex }}
                          />
                          <span>{row.colorName}</span>
                        </td>
                        <td className="p-2 font-mono tabular-nums">₹{row.priceInr}</td>
                        <td className="p-2 font-mono tabular-nums">{row.stockQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {importMessage && (
          <div className="p-4 bg-[#E3EBE4] border border-[#a6cbb0] rounded-[2px] text-xs text-[#1B3B2B] font-mono">
            {importMessage}
          </div>
        )}
      </div>
    </>
  );
}
