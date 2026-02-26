/**
 * Lee un archivo PDF y extrae todo su texto.
 * Soporta PDFs protegidos con contraseña.
 * @param {File} file - El archivo PDF cargado por el usuario.
 * @param {string} password - Contraseña opcional para PDFs protegidos.
 * @returns {Promise<string>} - El texto completo del PDF.
 */
export const extractTextFromPDF = async (file, password = null) => {
    try {
        // 🚀 Carga de Módulo Nativa via CDN (Ignora Vite, Funciona 100% en Browser)
        // Usamos una versión específica estable compatible con módulos ES.
        const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.min.mjs');

        if (!pdfjsLib) {
            throw new Error("Fallo al descargar PDF.js del CDN. Revisá tu conectividad.");
        }

        // Asignamos el worker que procesa el PDF en segundo plano
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs';

        const arrayBuffer = await file.arrayBuffer();

        // 🔒 SEGURIDAD: Timeout de 30 segundos para prevenir bombas de descompresión
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 30000)
        );

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            password: password
        });

        let pdf;
        try {
            pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
        } catch (error) {
            // Timeout
            if (error.message === 'TIMEOUT_ERROR') {
                throw new Error('El archivo tardó demasiado en procesarse. Puede estar corrupto.');
            }

            // Detectar si el error es por contraseña
            if (error.name === 'PasswordException') {
                if (error.code === 1) {
                    // Necesita contraseña
                    throw new Error('PASSWORD_REQUIRED');
                } else if (error.code === 2) {
                    // Contraseña incorrecta
                    throw new Error('PASSWORD_INCORRECT');
                }
            }
            throw error;
        }

        // 🔒 SEGURIDAD: Limitar número de páginas (máximo 50)
        const MAX_PAGES = 50;
        if (pdf.numPages > MAX_PAGES) {
            throw new Error(`El PDF tiene ${pdf.numPages} páginas. El máximo permitido es ${MAX_PAGES} páginas.`);
        }

        let fullText = '';
        let totalChars = 0;
        const MAX_TOTAL_CHARS = 100000; // Máximo 100k caracteres (~50 páginas de texto)

        // Recorremos todas las páginas (índice base 1 en pdfjs)
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Concatenamos los items de texto de la página
            const pageText = textContent.items
                .map((item) => item.str)
                .join(' ');

            // 🔒 SEGURIDAD: Verificar que no se extraiga texto infinito
            totalChars += pageText.length;
            if (totalChars > MAX_TOTAL_CHARS) {
                throw new Error('El PDF contiene demasiado texto. Verificá que sea un resumen de tarjeta válido.');
            }

            fullText += `--- PÁGINA ${i} ---\n${pageText}\n\n`;
        }

        // 🔒 VALIDACIÓN MEJORADA: Verificar que sea un resumen bancario legítimo
        // Requiere al menos 3 keywords diferentes para evitar falsos positivos
        // Soporte Multilingüe: Español, Inglés, Portugués
        const keywords = [
            // ES
            'resumen', 'tarjeta', 'vencimiento', 'saldo', 'pago', 'cierre', 'credito', 'banco', 'visa', 'mastercard',
            // EN
            'statement', 'card', 'payment', 'balance', 'due', 'bank', 'account', 'bill',
            // PT
            'fatura', 'cartão', 'pagamento', 'saldo', 'vencimento', 'extrato', 'banco'
        ];
        const textLower = fullText.toLowerCase();
        const matchedKeywords = keywords.filter(keyword => textLower.includes(keyword));

        if (matchedKeywords.length < 3) {
            throw new Error('INVALID_DOCUMENT');
        }

        // 🔒 VALIDACIÓN: Verificar que tenga al menos 100 caracteres (no sea vacío)
        if (fullText.trim().length < 100) {
            throw new Error('El PDF parece estar vacío o no tiene suficiente contenido.');
        }

        return fullText;
    } catch (error) {
        console.error("Error al leer el PDF:", error);

        // Errores específicos con mensajes claros
        if (error.message === 'PASSWORD_REQUIRED') {
            throw new Error('Este PDF está protegido. Por favor, ingresá la contraseña.');
        }
        if (error.message === 'PASSWORD_INCORRECT') {
            throw new Error('Contraseña incorrecta. Intentá de nuevo.');
        }
        if (error.message === 'INVALID_DOCUMENT') {
            throw new Error('Este archivo no parece ser un resumen de tarjeta. Verificá que sea el documento correcto.');
        }

        throw new Error("No pudimos leer el archivo. Asegurate que sea un PDF válido.");
    }
};
