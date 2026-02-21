import { useState, useRef } from 'react';

export default function UploadZone({ onFileSelected, loading }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [city, setCity] = useState('mumbai');
  const [rent, setRent] = useState('25000');
  const [epf, setEpf] = useState('');
  const fileRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      setFileName(file.name);
      fileRef.current = file;
    }
  }

  function handleFileInput(e) {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      fileRef.current = file;
    }
  }

  function handleSubmit() {
    if (!fileRef.current) return;
    onFileSelected(
      fileRef.current,
      city,
      parseFloat(rent) || 0,
      epf ? parseFloat(epf) : null,
    );
  }

  return (
    <div>
      {/* ── Drop zone ────────────────────────────────────── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed p-8 text-center cursor-pointer
          transition-colors mb-4
          ${dragging
            ? 'border-(--color-ink) bg-(--color-paper-alt)'
            : 'border-(--color-line) hover:border-(--color-muted)'
          }
        `}
        onClick={() => document.getElementById('pdf-input').click()}
      >
        <input
          id="pdf-input"
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        {fileName ? (
          <div>
            <div className="text-sm mb-1">{fileName}</div>
            <div className="text-[10px] text-(--color-muted)">[click or drop to replace]</div>
          </div>
        ) : (
          <div>
            <div className="text-sm mb-1">drop Form 16 PDF here</div>
            <div className="text-[10px] text-(--color-muted)">[or click to browse]</div>
          </div>
        )}
      </div>

      {/* ── Context fields (not in Form 16) ──────────────── */}
      {fileName && (
        <div className="border border-(--color-line) p-4 mb-4 text-xs">
          <div className="text-[10px] tracking-[0.2em] text-(--color-muted) uppercase mb-3">
            context (not in Form 16)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-(--color-muted)">city</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="block w-full mt-1 p-1.5 bg-(--color-paper) border border-(--color-line) font-[inherit] text-xs"
              >
                <option value="mumbai">Mumbai</option>
                <option value="delhi">Delhi</option>
                <option value="kolkata">Kolkata</option>
                <option value="chennai">Chennai</option>
                <option value="bangalore">Bangalore</option>
                <option value="hyderabad">Hyderabad</option>
                <option value="pune">Pune</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="text-(--color-muted)">monthly rent</span>
              <input
                type="number"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                placeholder="0"
                className="block w-full mt-1 p-1.5 bg-(--color-paper) border border-(--color-line) font-[inherit] text-xs"
              />
            </label>
            <label className="block">
              <span className="text-(--color-muted)">EPF/year (optional)</span>
              <input
                type="number"
                value={epf}
                onChange={(e) => setEpf(e.target.value)}
                placeholder="auto-detect"
                className="block w-full mt-1 p-1.5 bg-(--color-paper) border border-(--color-line) font-[inherit] text-xs"
              />
            </label>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4 px-6 py-2 bg-(--color-ink) text-(--color-paper) border-0 font-[inherit] text-xs tracking-wider cursor-pointer hover:opacity-80 disabled:opacity-40"
          >
            {loading ? '[ parsing... ]' : '[ analyze ]'}
          </button>
        </div>
      )}
    </div>
  );
}
