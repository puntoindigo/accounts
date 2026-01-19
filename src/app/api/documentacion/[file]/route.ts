import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  
  // Validar que el archivo sea seguro (solo .md)
  if (!file.endsWith('.md')) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Lista blanca de archivos permitidos
  const allowedFiles = [
    'prompt-completo-ia.md',
    'guia-completa-desarrollo.md'
  ];

  if (!allowedFiles.includes(file)) {
    return NextResponse.json({ error: 'File not allowed' }, { status: 403 });
  }

  try {
    const filePath = join(process.cwd(), 'src', 'app', 'documentacion', file);
    const content = readFileSync(filePath, 'utf-8');
    
    return NextResponse.json({ content }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
