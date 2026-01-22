
import React, { useRef, useState } from 'react';
import { Upload, Music, Video, FileAudio, Layers } from 'lucide-react';

interface FilePickerProps {
  onFileSelect: (files: File[]) => void;
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
    
    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    validateAndSelect(droppedFiles);
  };

  const validateAndSelect = (files: File[]) => {
    const validTypes = ['audio/', 'video/'];
    const validFiles = files.filter(file => 
        validTypes.some(type => file.type.startsWith(type)) || 
        file.name.match(/\.(mp3|wav|m4a|mp4|mov|ogg|flac|webm)$/i)
    );

    if (validFiles.length > 0) {
        onFileSelect(validFiles);
    } else {
        alert("Nenhum arquivo de áudio ou vídeo válido encontrado.");
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer border-2 border-dashed rounded-2xl p-10 transition-all duration-300
        ${isDragging ? 'border-violet-500 bg-violet-500/5' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="audio/*,video/*,.webm"
        multiple
        onChange={(e) => e.target.files && validateAndSelect(Array.from(e.target.files) as File[])}
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-violet-400 group-hover:bg-violet-500/10 transition-colors">
          <Layers size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-1">
            Solte seus arquivos aqui
          </h3>
          <p className="text-zinc-500 max-w-xs mx-auto text-sm">
            Processamento multi-processual. <br/>
            MP3, WAV, WebM, MP4 e MOV.
          </p>
        </div>
        <div className="flex gap-4 mt-2 justify-center opacity-60">
            <Music size={16} />
            <Video size={16} />
            <FileAudio size={16} />
        </div>
      </div>
    </div>
  );
};
