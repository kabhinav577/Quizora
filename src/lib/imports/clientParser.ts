import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { RawImportRow } from '@/services/imports';

/**
 * Parses CSV, XLSX, or ZIP files in browser or server
 */
export async function parseImportFile(
  file: File | Blob | ArrayBuffer | Uint8Array,
  fileName: string
): Promise<{
  rows: RawImportRow[];
  imagesMap: Map<string, Blob>;
  error?: string;
}> {
  const isZip = fileName.endsWith('.zip');
  const imagesMap = new Map<string, Blob>();

  if (isZip) {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      let spreadsheetEntry: JSZip.JSZipObject | null = null;
      const imagePromises: Promise<void>[] = [];

      zipContent.forEach((relativePath, entry) => {
        const lower = relativePath.toLowerCase();
        if (
          !entry.dir &&
          (lower.endsWith('.xlsx') || lower.endsWith('.csv') || lower.endsWith('.xls')) &&
          !lower.includes('__macosx')
        ) {
          spreadsheetEntry = entry;
        }

        // Collect images
        if (
          !entry.dir &&
          (lower.endsWith('.png') ||
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.webp')) &&
          !lower.includes('__macosx')
        ) {
          const baseName = relativePath.split('/').pop() || relativePath;
          imagePromises.push(
            entry.async('blob').then((blob) => {
              imagesMap.set(baseName.toLowerCase(), blob);
            })
          );
        }
      });

      await Promise.all(imagePromises);

      if (!spreadsheetEntry) {
        return {
          rows: [],
          imagesMap,
          error: 'No Excel (.xlsx) or CSV file found inside the uploaded ZIP archive.',
        };
      }

      const fileBuffer = await (spreadsheetEntry as JSZip.JSZipObject).async('arraybuffer');
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<RawImportRow>(sheet, { defval: '' });

      return { rows, imagesMap };
    } catch (err: unknown) {
      return {
        rows: [],
        imagesMap,
        error: `Failed to unpack ZIP archive: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  } else {
    // Single CSV or XLSX
    try {
      let arrayBuffer: ArrayBuffer;
      if (file instanceof ArrayBuffer) {
        arrayBuffer = file;
      } else if (file instanceof Uint8Array) {
        arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
      } else {
        arrayBuffer = await file.arrayBuffer();
      }
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<RawImportRow>(sheet, { defval: '' });

      return { rows, imagesMap };
    } catch (err: unknown) {
      return {
        rows: [],
        imagesMap,
        error: `Failed to parse spreadsheet: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Generates sample CSV string for admin download
 */
export function generateSampleCsv(): string {
  const headers = [
    'question_text',
    'question_image',
    'option_a',
    'option_a_image',
    'option_b',
    'option_b_image',
    'option_c',
    'option_c_image',
    'option_d',
    'option_d_image',
    'option_e',
    'option_e_image',
    'correct_option',
    'explanation',
    'exam',
    'subject',
    'topic',
    'difficulty',
    'default_time_seconds',
    'marks',
    'negative_marks',
    'source_name',
    'source_year',
  ];

  const sampleRows = [
    [
      '"Which CPU scheduling algorithm gives minimal average turnaround time?"',
      '""',
      '"First Come First Served (FCFS)"',
      '""',
      '"Shortest Job First (SJF)"',
      '""',
      '"Round Robin (RR)"',
      '""',
      '"Priority Scheduling"',
      '""',
      '""',
      '""',
      '2',
      '"SJF is provably optimal for minimizing average waiting and turnaround time."',
      '"Bihar STET"',
      '"Computer Science"',
      '"Operating Systems"',
      '"medium"',
      '45',
      '1.0',
      '0.25',
      '"Bihar STET"',
      '2024',
    ],
    [
      '"Identify the logic gate corresponding to the diagram in Q002.png"',
      '"images/Q002.png"',
      '"NAND Gate"',
      '""',
      '"NOR Gate"',
      '""',
      '"XOR Gate"',
      '""',
      '"XNOR Gate"',
      '""',
      '"None of the above"',
      '""',
      '1',
      '"An AND gate followed by an inversion bubble represents a NAND gate."',
      '"Bihar STET"',
      '"Computer Science"',
      '"Computer Fundamentals"',
      '"easy"',
      '30',
      '1.0',
      '0.25',
      '"Bihar STET"',
      '2024',
    ],
    [
      '"Which circuit diagram represents an operational amplifier comparator?"',
      '""',
      '""',
      '"images/opamp_a.png"',
      '""',
      '"images/opamp_b.png"',
      '""',
      '"images/opamp_c.png"',
      '""',
      '"images/opamp_d.png"',
      '""',
      '""',
      '3',
      '"Option C shows open-loop op-amp configuration without negative feedback."',
      '"Bihar STET"',
      '"Computer Science"',
      '"Computer Fundamentals"',
      '"hard"',
      '60',
      '1.0',
      '0.25',
      '"GATE"',
      '2023',
    ],
  ];

  return [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
}
