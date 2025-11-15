
import React, { useCallback, useState } from 'react';
import { FileUp } from 'lucide-react';

interface FileUploadProps {
    onFileUpload: (file: File) => void;
    title: string;
    description: string;
    acceptedFileTypes: string;
    Icon: React.ElementType;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, title, description, acceptedFileTypes, Icon }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            onFileUpload(event.target.files[0]);
        }
    };

    const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            onFileUpload(event.dataTransfer.files[0]);
        }
    }, [onFileUpload]);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

    const handleDragEnter = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);

    return (
        <div className="w-full max-w-lg mx-auto text-center">
            <Icon className="mx-auto h-16 w-16 text-cyan-400" />
            <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">{description}</p>
            <label
                htmlFor="file-upload"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`mt-6 relative block w-full rounded-lg border-2 border-dashed ${isDragging ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' : 'border-slate-300 dark:border-slate-600'} p-12 text-center hover:border-slate-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors duration-300 cursor-pointer`}
            >
                <FileUp className="mx-auto h-12 w-12 text-slate-400" />
                <span className="mt-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">
                    {isDragging ? 'Drop the file here' : 'Click to upload or drag and drop'}
                </span>
                <span className="mt-1 block text-xs text-slate-500">{acceptedFileTypes.replace('.', '').toUpperCase()} file</span>
                 <input id="file-upload" name="file-upload" type="file" className="sr-only" accept={acceptedFileTypes} onChange={handleFileChange} />
            </label>
        </div>
    );
};

export default FileUpload;
