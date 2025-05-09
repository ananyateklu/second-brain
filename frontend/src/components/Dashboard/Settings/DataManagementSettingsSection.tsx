import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../../contexts/themeContextUtils';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { useNotes } from '../../../contexts/notesContextUtils';
import { CustomDropdown } from '../../shared/CustomDropdown';

interface Note {
    title: string;
    content: string;
    tags: string[];
    isFavorite: boolean;
    isPinned: boolean;
    isIdea: boolean;
    isArchived: boolean;
    isDeleted: boolean;
    createdAt: string | Date;
}

interface ImportResult {
    success: boolean;
    message: string;
    importedCount?: number;
}

interface PDFTextItem {
    str: string;
    dir?: string;
    transform?: number[];
    width?: number;
    height?: number;
    fontName?: string;
}

interface PDFTextContent {
    items: PDFTextItem[];
    styles?: Record<string, {
        fontFamily?: string;
        fontSize?: number;
        fontWeight?: string | number;
        color?: string;
    }>;
}

interface ExportOptions {
    format: 'markdown' | 'txt' | 'html' | 'docx';
    mode: 'single' | 'multiple';
}

export function DataManagementSettingsSection() {
    const { theme } = useTheme();
    const { addNote, notes } = useNotes();
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [exportResult, setExportResult] = useState<ImportResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [pdfLib, setPdfLib] = useState<typeof import('pdfjs-dist')>();
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        format: 'markdown',
        mode: 'single'
    });

    // Initialize PDF.js worker
    useEffect(() => {
        const loadPdfLib = async () => {
            try {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
                setPdfLib(pdfjs);
            } catch (error) {
                console.error('Failed to load PDF.js:', error);
            }
        };
        loadPdfLib();
    }, []);

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-[#1e293b]/30';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const innerElementClasses = `
    ${getContainerBackground()}
    border-[0.5px] 
    border-white/10
    backdrop-blur-xl
    rounded-xl
    transition-all
    duration-200
    hover:bg-[var(--color-surfaceHover)]
  `;

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const processMarkdownFile = async (fileContent: string): Promise<{ title: string; content: string; }[]> => {
        const notes: { title: string; content: string; }[] = [];
        const sections = fileContent.split(/^# /m).filter(Boolean);

        for (const section of sections) {
            const lines = section.trim().split('\n');
            const title = lines[0].trim();
            const noteContent = lines.slice(1).join('\n').trim();
            notes.push({ title, content: noteContent });
        }

        return notes;
    };

    const processTextFile = async (fileContent: string): Promise<{ title: string; content: string; }[]> => {
        const lines = fileContent.trim().split('\n');
        const title = lines[0].trim();
        const noteContent = lines.slice(1).join('\n').trim();
        return [{ title, content: noteContent }];
    };

    const processHTMLFile = async (fileContent: string): Promise<{ title: string; content: string; }[]> => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(fileContent, 'text/html');
        const title = doc.title || doc.querySelector('h1')?.textContent || 'Imported Note';
        const noteContent = doc.body.textContent || '';
        return [{ title, content: noteContent }];
    };

    const processDocxFile = async (file: File): Promise<{ title: string; content: string; }[]> => {
        // Dynamically import mammoth
        const mammoth = (await import('mammoth')).default;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const lines = result.value.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            throw new Error('Empty DOCX file');
        }

        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        return [{ title, content }];
    };

    const processPDFFile = async (file: File): Promise<{ title: string; content: string; }[]> => {
        if (!pdfLib) {
            throw new Error('PDF processing is not ready yet. Please try again.');
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const typedArray = new Uint8Array(arrayBuffer);

            const loadingTask = pdfLib.getDocument({ data: typedArray });
            const pdf = await loadingTask.promise;

            let fullText = '';
            const title = file.name.replace('.pdf', ''); // Use filename as default title

            try {
                // Extract text from each page
                for (let i = 1; i <= pdf.numPages; i++) {
                    try {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent() as PDFTextContent;

                        const pageText = textContent.items
                            .filter((item: PDFTextItem) => item.str && typeof item.str === 'string')
                            .map((item: PDFTextItem) => item.str.trim())
                            .join(' ');

                        // Add page number for better organization
                        fullText += `Page ${i}:\n${pageText}\n\n`;
                    } catch (pageError) {
                        console.error("Error processing page %s:", i, pageError);
                        // Continue with next page if one fails
                        fullText += `[Error reading page ${i}]\n\n`;
                    }
                }

                // Clean up the content
                const content = fullText
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line)
                    .join('\n');

                if (!content) {
                    console.error('No content extracted from PDF');
                    throw new Error('No readable text found in PDF file');
                }

                // Create a more descriptive title
                const finalTitle = `${title} (${pdf.numPages} pages)`;

                return [{
                    title: finalTitle,
                    content: content
                }];
            } finally {
                // Clean up PDF document
                pdf.destroy();
            }
        } catch (error) {
            console.error('PDF processing error:', error);
            // More descriptive error message
            const errorMessage = error instanceof Error
                ? `Failed to process PDF: ${error.message}`
                : 'Failed to process PDF file';
            throw new Error(errorMessage);
        }
    };

    interface ExcelRow {
        [key: string]: string | number | boolean | null;
    }

    const processExcelFile = async (file: File): Promise<{ title: string; content: string; }[]> => {
        // Dynamically import xlsx
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const notes: { title: string; content: string; }[] = [];

        // Process each sheet as a separate note
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as ExcelRow[][];

            // Convert the sheet data to a formatted string
            const content = jsonData
                .map(row => row.map(cell => String(cell)).join('\t'))
                .join('\n');

            notes.push({
                title: sheetName,
                content: content
            });
        }

        return notes;
    };

    const processRTFFile = async (file: File): Promise<{ title: string; content: string; }[]> => {
        const text = await file.text();
        // Basic RTF to text conversion (you might want to use a more robust RTF parser)
        const plainText = text.replace(/[\\{}]|\\\w+\s?/g, '');
        const lines = plainText.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            throw new Error('Empty RTF file');
        }

        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        return [{ title, content }];
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files?.length) return;

        setIsImporting(true);
        setImportResult(null);
        let importedCount = 0;


        try {
            for (const file of Array.from(files)) {

                let notes: { title: string; content: string; }[] = [];

                try {
                    switch (file.type) {
                        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                            notes = await processDocxFile(file);
                            break;
                        case 'application/pdf':
                            notes = await processPDFFile(file);
                            break;
                        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                        case 'application/vnd.ms-excel':
                            notes = await processExcelFile(file);
                            break;
                        case 'application/rtf':
                        case 'text/rtf':
                            notes = await processRTFFile(file);
                            break;
                        case 'text/markdown':
                        case 'text/x-markdown':
                            notes = await processMarkdownFile(await file.text());
                            break;
                        case 'text/html':
                            notes = await processHTMLFile(await file.text());
                            break;
                        case 'text/plain':
                            notes = await processTextFile(await file.text());
                            break;
                        default:
                            // Handle files by extension if MIME type is not recognized
                            if (file.name.endsWith('.docx')) {
                                notes = await processDocxFile(file);
                            } else if (file.name.endsWith('.pdf')) {
                                notes = await processPDFFile(file);
                            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                                notes = await processExcelFile(file);
                            } else if (file.name.endsWith('.rtf')) {
                                notes = await processRTFFile(file);
                            } else if (file.name.endsWith('.md')) {
                                notes = await processMarkdownFile(await file.text());
                            } else if (file.name.endsWith('.txt')) {
                                notes = await processTextFile(await file.text());
                            } else {
                                throw new Error(`Unsupported file type: ${file.type || file.name}`);
                            }
                    }

                    for (const note of notes) {
                        // Create the note using the addNote function
                        await addNote({
                            title: note.title || file.name.replace(/\.[^/.]+$/, ''), // Use filename without extension if no title
                            content: note.content,
                            tags: ['imported', file.type.split('/')[1] || 'unknown', `imported-${new Date().toISOString().split('T')[0]}`],
                            isFavorite: false,
                            isPinned: false,
                            isIdea: false,
                            isArchived: false,
                            isDeleted: false
                        });
                        importedCount++;
                    }
                } catch (error) {
                    console.error('Failed to process file:', {
                        fileName: file.name,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        stack: error instanceof Error ? error.stack : undefined
                    });

                    setImportResult({
                        success: false,
                        message: `Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
                    });
                }
            }

            if (importedCount > 0) {
                setImportResult({
                    success: true,
                    message: `Successfully imported ${importedCount} note${importedCount !== 1 ? 's' : ''}`,
                    importedCount
                });
            }
        } catch (error) {
            console.error('Import process failed:', error);
            setImportResult({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to import notes'
            });
        } finally {
            setIsImporting(false);
            setDragActive(false);
        }
    };

    const generateExportContent = (notes: Note[], format: ExportOptions['format']): string => {
        switch (format) {
            case 'markdown':
                return notes.map(note => `# ${note.title}\n\n${note.content}`).join('\n\n---\n\n');
            case 'html':
                return `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Exported Notes</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
              h1 { color: #333; }
              .note { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #eee; }
              .meta { color: #666; font-size: 0.9rem; }
            </style>
          </head>
          <body>
            ${notes.map(note => `
              <div class="note">
                <h1>${note.title}</h1>
                <div class="content">${note.content.split('\n').join('<br>')}</div>
                <div class="meta">Created: ${new Date(note.createdAt).toLocaleDateString()}</div>
              </div>
            `).join('')}
          </body>
          </html>
        `;
            default:
                return notes.map(note => `${note.title}\n\n${note.content}`).join('\n\n==========\n\n');
        }
    };

    const handleExport = async () => {
        try {
            const notesToExport = notes.filter(note => !note.isDeleted && !note.isArchived);

            if (exportOptions.mode === 'single') {
                // Single file export
                const content = generateExportContent(notesToExport, exportOptions.format);
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `notes-export.${exportOptions.format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // Multiple files export
                for (const note of notesToExport) {
                    const content = generateExportContent([note], exportOptions.format);
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const safeTitle = note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    a.download = `${safeTitle}.${exportOptions.format}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }

            setExportResult({
                success: true,
                message: `Successfully exported ${notesToExport.length} notes`
            });
        } catch (error) {
            console.error('Export failed:', error);
            setExportResult({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to export notes'
            });
        }
    };

    const formatOptions = [
        { id: 'markdown', label: 'Markdown (.md)' },
        { id: 'txt', label: 'Plain Text (.txt)' },
        { id: 'html', label: 'HTML (.html)' }
    ];

    const modeOptions = [
        { id: 'single', label: 'Single File (All Notes)' },
        { id: 'multiple', label: 'Multiple Files (One per Note)' }
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-[var(--color-text)]">Data Management</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Import, export and manage your data</p>

            <div className="space-y-8">
                {/* Import and Export Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Import Section */}
                    <motion.div
                        variants={cardVariants}
                        className={innerElementClasses}
                    >
                        <div
                            className={`
                p-8
                border-2 
                border-dashed 
                rounded-xl 
                ${dragActive ? 'border-[var(--color-accent)]' : 'border-white/10'}
                transition-all 
                duration-200
                text-center
                space-y-6
                h-full
                flex flex-col justify-center
              `}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleFiles(e.dataTransfer.files);
                            }}
                        >
                            <div className="flex flex-col items-center gap-6">
                                <div className={`
                  w-20 h-20 
                  rounded-2xl 
                  flex items-center justify-center
                  ${getContainerBackground()}
                  border-[0.5px] border-white/10
                `}>
                                    <FileText className="w-10 h-10 text-[var(--color-accent)]" />
                                </div>
                                <div className="space-y-3">
                                    <p className="text-xl font-medium text-[var(--color-text)]">
                                        Drag and drop your files here
                                    </p>
                                    <p className="text-sm text-[var(--color-textSecondary)]">
                                        Supported formats: PDF, Word (.docx), Excel (.xlsx), RTF, Markdown (.md), Text (.txt), HTML (.html)
                                    </p>
                                </div>
                                <label className={`
                  inline-flex items-center gap-2 px-6 py-3 rounded-lg 
                  ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
                  text-white text-sm font-medium 
                  transition-all duration-200 
                  hover:scale-105 hover:-translate-y-0.5 
                  shadow-sm hover:shadow-md
                  cursor-pointer
                `}>
                                    <Upload className="w-4 h-4" />
                                    Browse Files
                                    <input
                                        type="file"
                                        className="hidden"
                                        multiple
                                        accept=".pdf,.docx,.xlsx,.xls,.rtf,.md,.txt,.html"
                                        onChange={(e) => handleFiles(e.target.files)}
                                    />
                                </label>
                            </div>
                        </div>
                    </motion.div>

                    {/* Export Section */}
                    <motion.div
                        variants={cardVariants}
                        className={innerElementClasses}
                    >
                        <div className="p-8 space-y-6 h-full flex flex-col">
                            <div className="flex items-center gap-4">
                                <div className={`
                  w-16 h-16 
                  rounded-xl 
                  flex items-center justify-center
                  ${getContainerBackground()}
                  border-[0.5px] border-white/10
                `}>
                                    <Download className="w-8 h-8 text-[var(--color-accent)]" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-medium text-[var(--color-text)]">Export Notes</h3>
                                    <p className="text-sm text-[var(--color-textSecondary)]">
                                        Export your notes in various formats
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6 flex-grow">
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-medium text-[var(--color-text)]">
                                        Export Format
                                    </label>
                                    <CustomDropdown
                                        options={formatOptions}
                                        selectedId={exportOptions.format}
                                        onSelect={(format) => setExportOptions(prev => ({ ...prev, format: format as ExportOptions['format'] }))}
                                        placeholder="Select format"
                                    />
                                </div>

                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-medium text-[var(--color-text)]">
                                        Export Mode
                                    </label>
                                    <CustomDropdown
                                        options={modeOptions}
                                        selectedId={exportOptions.mode}
                                        onSelect={(mode) => setExportOptions(prev => ({ ...prev, mode: mode as ExportOptions['mode'] }))}
                                        placeholder="Select mode"
                                    />
                                </div>

                                <button
                                    onClick={handleExport}
                                    className={`
                    w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg 
                    ${theme === 'midnight' ? 'bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]/70' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'}
                    text-white text-sm font-medium 
                    transition-all duration-200 
                    hover:scale-105 hover:-translate-y-0.5 
                    shadow-sm hover:shadow-md
                    mt-6
                  `}
                                >
                                    <Download className="w-4 h-4" />
                                    Export Notes
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Status Messages */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Import Status */}
                    {(isImporting || importResult) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`
                p-4 rounded-lg
                ${importResult?.success ? 'bg-[var(--color-accent)]/10' : 'bg-red-500/10'}
                border-[0.5px] border-white/10
              `}
                        >
                            <div className="flex items-center gap-2">
                                {isImporting ? (
                                    <>
                                        <Loader className="w-5 h-5 text-[var(--color-accent)] animate-spin" />
                                        <p className="text-sm text-[var(--color-accent)]">
                                            Importing notes...
                                        </p>
                                    </>
                                ) : importResult?.success ? (
                                    <>
                                        <CheckCircle className="w-5 h-5 text-[var(--color-accent)]" />
                                        <p className="text-sm text-[var(--color-accent)]">
                                            {importResult.message}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        <p className="text-sm text-red-500">
                                            {importResult?.message}
                                        </p>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Export Status */}
                    {exportResult && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`
                p-4 rounded-lg
                ${exportResult.success ? 'bg-[var(--color-accent)]/10' : 'bg-red-500/10'}
                border-[0.5px] border-white/10
              `}
                        >
                            <div className="flex items-center gap-2">
                                {exportResult.success ? (
                                    <>
                                        <CheckCircle className="w-5 h-5 text-[var(--color-accent)]" />
                                        <p className="text-sm text-[var(--color-accent)]">
                                            {exportResult.message}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        <p className="text-sm text-red-500">
                                            {exportResult.message}
                                        </p>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
} 