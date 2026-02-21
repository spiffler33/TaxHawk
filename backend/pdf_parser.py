"""PDF text extraction for Form 16 using pdfplumber.

Phase 1 of the parsing pipeline:
    PDF file → raw text (preserving table structure)

pdfplumber is used because it preserves whitespace and table layouts,
which is critical for Form 16's nested statutory tables.
"""

from io import BytesIO
from pathlib import Path
from typing import Union

import pdfplumber


def extract_text_from_pdf(source: Union[str, Path, bytes, BytesIO]) -> str:
    """Extract raw text from a PDF file.

    Args:
        source: File path (str/Path) or file content (bytes/BytesIO).

    Returns:
        Concatenated text from all pages, separated by newlines.

    Raises:
        ValueError: If the PDF yields no text at all.
    """
    if isinstance(source, (str, Path)):
        pdf = pdfplumber.open(source)
    elif isinstance(source, bytes):
        pdf = pdfplumber.open(BytesIO(source))
    elif isinstance(source, BytesIO):
        pdf = pdfplumber.open(source)
    else:
        raise TypeError(f"Unsupported source type: {type(source)}")

    pages_text = []
    with pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text)

    full_text = "\n".join(pages_text)
    if not full_text.strip():
        raise ValueError("PDF contains no extractable text. It may be scanned/image-based.")

    return full_text
