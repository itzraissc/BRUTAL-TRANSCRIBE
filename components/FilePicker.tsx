
import React, { useRef, useState } from 'react';
import { Upload, Music, Video, FileAudio } from 'lucide-react';

interface FilePickerProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

export const FilePicker: React.FC<FilePickerProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  };

  const validateAndSelect = (file: File) => {
    const validTypes = ['audio/', 'video/'];
    if (validTypes.some(type => file.type.startsWith(type)) || file.name.endsWith('.mp3') || file.name.endsWith('.mp4')) {
        onFileSelect(file);
    } else {
        alert("Por favor, envie um arquivo de áudio ou vídeo válido.");
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer border-2 border-dashed rounded-2xl p-12 transition-all duration-300
        ${isDragging ? 'border-violet-500 bg-violet-500/5' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="audio/*,video/*"
        onChange={(e) => e.target.files?.[0] && validateAndSelect(e.target.files[0])}
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-violet-400 group-hover:bg-violet-500/10 transition-colors">
          <Upload size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-1">
            Solte sua mídia aqui
          </h3>
          <p className="text-zinc-500 max-w-xs mx-auto">
            Suporte para MP3, WAV, M4A, MP4, MOV e mais. 
            Precisão máxima garantida.
          </p>
        </div>
        <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium text-zinc-400">
                <Music size={14} /> Áudio
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium text-zinc-400">
                <Video size={14} /> Vídeo
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium text-zinc-400">
                <FileAudio size={14} /> Podcast
            </div>
        </div>
      </div>
    </div>
  );
};
