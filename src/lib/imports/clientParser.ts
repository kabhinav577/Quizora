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
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const rows = sanitizeRows(rawRows);

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
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const rows = sanitizeRows(rawRows);

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
 * Strips non-enumerable properties (such as __rowNum__ added by XLSX)
 * and UTF-8 BOM characters from keys, guaranteeing 100% plain objects
 * that can be safely serialized over Next.js Server Actions.
 */
function sanitizeRows(rawRows: Record<string, unknown>[]): RawImportRow[] {
  return rawRows.map((row) => {
    const plain: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.replace(/^\uFEFF/, '').trim();
      if (!cleanKey) continue;

      if (value === null || value === undefined) {
        plain[cleanKey] = '';
      } else if (typeof value === 'object') {
        plain[cleanKey] = String(value);
      } else {
        plain[cleanKey] = value as string | number;
      }
    }
    return plain as RawImportRow;
  });
}

/**
 * Generates sample CSV string for admin download
 */
export function generateSampleCsv(): string {
  const headers = [
    'exam',
    'subject',
    'topic',
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
    'difficulty',
    'default_time_seconds',
    'marks',
    'negative_marks',
    'source_name',
    'source_year',
  ];

  const sampleRows = [
    [
      '"Bihar STET|Bihar TRE 4.0"',
      '"Computer Science"',
      '"Computer Networks"',
      '"Which layer of the OSI model is responsible for routing packets?"',
      '""',
      '"Application"',
      '""',
      '"Network"',
      '""',
      '"Transport"',
      '""',
      '"Data Link"',
      '""',
      '"Physical"',
      '""',
      '"B"',
      '"The Network Layer provides logical addressing and routing between networks."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026.0',
    ],
    [
      '"Bihar STET|Bihar TRE 4.0"',
      '"Computer Science"',
      '"Computer Networks"',
      '"Which protocol is connection-oriented?"',
      '""',
      '"UDP"',
      '""',
      '"TCP"',
      '""',
      '"IP"',
      '""',
      '"ICMP"',
      '""',
      '""',
      '""',
      '"B"',
      '"TCP establishes a connection before data transfer."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026.0',
    ],
    [
      '"Bihar TRE 4.0"',
      '"Computer Science"',
      '"Computer Networks"',
      '"Which technique divides an IP network into smaller logical networks?"',
      '""',
      '"Multiplexing"',
      '""',
      '"Fragmentation"',
      '""',
      '"Subnetting"',
      '""',
      '"Encapsulation"',
      '""',
      '"Switching"',
      '""',
      '"C"',
      '"Subnetting divides a network into smaller subnetworks."',
      '"Medium"',
      '45',
      '1.0',
      '0.25',
      '"Practice"',
      '2026.0',
    ],
    [
      '"Bihar STET"',
      '"Computer Science"',
      '"Data Structures"',
      '"Which data structure follows the FIFO principle?"',
      '""',
      '"Stack"',
      '""',
      '"Queue"',
      '""',
      '"Tree"',
      '""',
      '"Graph"',
      '""',
      '""',
      '""',
      '"B"',
      '"A queue follows First In First Out (FIFO)."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026.0',
    ],
    [
      '"Bihar STET|Bihar TRE 4.0"',
      '"Computer Science"',
      '"Operating Systems"',
      '"Which scheduling algorithm uses a fixed time quantum?"',
      '""',
      '"FCFS"',
      '""',
      '"SJF"',
      '""',
      '"Round Robin"',
      '""',
      '"Priority"',
      '""',
      '""',
      '""',
      '"C"',
      '"Round Robin scheduling assigns processes a fixed time quantum."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026.0',
    ],
    [
      '"Bihar TRE 4.0"',
      '"Computer Science"',
      '"Compiler Design"',
      '"Which compiler phase converts a character stream into tokens?"',
      '""',
      '"Syntax Analysis"',
      '""',
      '"Lexical Analysis"',
      '""',
      '"Semantic Analysis"',
      '""',
      '"Code Generation"',
      '""',
      '""',
      '""',
      '"B"',
      '"Lexical analysis groups characters into tokens."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026.0',
    ],
    [
      '"Bihar STET|Bihar TRE 4.0"',
      '"Computer Science"',
      '"DBMS"',
      '"Which normal form removes partial functional dependency?"',
      '""',
      '"1NF"',
      '""',
      '"2NF"',
      '""',
      '"3NF"',
      '""',
      '"BCNF"',
      '""',
      '""',
      '""',
      '"B"',
      '"Second Normal Form removes partial dependency on a composite candidate key."',
      '"Medium"',
      '45',
      '1.0',
      '0.25',
      '"Practice"',
      '2026.0',
    ],
    [
      '"Bihar TRE 4.0"',
      '"Computer Science"',
      '"Algorithms"',
      '"Which algorithm uses divide-and-conquer and has average-case O(n log n) time?"',
      '""',
      '"Bubble Sort"',
      '""',
      '"Selection Sort"',
      '""',
      '"Merge Sort"',
      '""',
      '"Linear Search"',
      '""',
      '""',
      '""',
      '"C"',
      '"Merge Sort uses divide-and-conquer and runs in O(n log n) time."',
      '"Medium"',
      '45',
      '1.0',
      '0.25',
      '"Practice"',
      '2026.0',
    ],
    [
      '"Bihar STET"',
      '"Computer Science"',
      '"Digital Logic"',
      '"Which gate is known as a universal gate?"',
      '""',
      '"AND"',
      '""',
      '"OR"',
      '""',
      '"XOR"',
      '""',
      '"NAND"',
      '""',
      '""',
      '""',
      '"D"',
      '"NAND and NOR are universal gates. NAND is one of them."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026.0',
    ],
    [
      '"Bihar TRE 4.0"',
      '"Computer Science"',
      '"Computer Networks"',
      '"Which protocol is commonly used to securely transfer files over an SSH connection?"',
      '""',
      '"FTP"',
      '""',
      '"TFTP"',
      '""',
      '"SFTP"',
      '""',
      '"HTTP"',
      '""',
      '"HTTPS"',
      '""',
      '"C"',
      '"SFTP provides secure file transfer over SSH."',
      '"Medium"',
      '45',
      '1',
      '0.25',
      '"Practice"',
      '2026',
    ],
  ];

  return [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
}
