# React PDF Statement Extractor

[![npm version](https://badge.fury.io/js/react-pdf-statement-extractor.svg)](https://badge.fury.io/js/react-pdf-statement-extractor)

A lightweight, secure, **browser-only** PDF text extraction library for React, tailored for credit card statements and financial documents. 

**Powered by [DeepFi](https://deepfi.ar)**

## Why we built this

Extracting financial data usually requires sending PDFs to a backend server. We wanted an Open Source, 100% client-side solution that guarantees **user privacy**. This tool extracts all the text *inside the browser's memory* before any interaction with an LLM or database. 

## Features

- **100% Client-Side**: The PDF never leaves the browser.
- **Secure Limits**: Built-in protections against zip/decompression bombs. Max pages (50) and max characters (100k) enforced.
- **Financial Validation**: Smart verification to ensure the document contains financial keywords (EN, ES, PT) before processing.
- **Password Support**: Handles encrypted PDFs with custom errors.
- **Zero Build Setup**: Uses lazy loading CDN imports to prevent Vite or Webpack build issues with `pdf.js` web workers.

## Installation

```bash
npm install react-pdf-statement-extractor
```

## Basic Usage

```javascript
import { extractTextFromPDF } from "react-pdf-statement-extractor";

async function handleFileUpload(event) {
  const file = event.target.files[0];
  
  try {
    const extractedText = await extractTextFromPDF(file);
    console.log("PDF Content:", extractedText);
    
    // Now you can safely send `extractedText` to an LLM or backend!
    
  } catch (error) {
    if (error.message === 'PASSWORD_REQUIRED') {
      alert("This PDF is encrypted. Please provide a password.");
    } else {
      alert(error.message);
    }
  }
}
```

## With Passwords

```javascript
const text = await extractTextFromPDF(file, "mypassword123");
```

## How It Works in DeepFi

At [DeepFi](https://deepfi.ar) we use this library to locally extract your credit card statements, and then we send **only the raw text** to our backend LLM (Groq API) for categorization and advice. Your full PDF file and PII data are never uploaded anywhere.

## Open Source

This is the extraction core of DeepFi. We are open sourcing it to maintain transparency about how we handle user data. 

## License

MIT
