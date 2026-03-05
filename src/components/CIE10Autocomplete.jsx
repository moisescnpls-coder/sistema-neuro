import React, { useState, useEffect, useRef } from 'react';
import { Search, Stethoscope, X } from 'lucide-react';
import { cie10Service } from '../services/cie10';

const CIE10Autocomplete = ({ onSelect, initialValue = '', disabled = false }) => {
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef(null);

    // Click outside to close implementation
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [wrapperRef]);

    // Auto-update query when initialValue changes from outside
    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    const handleSearch = (e) => {
        const val = e.target.value;
        setQuery(val);

        if (val.length >= 2) {
            const matches = cie10Service.findDiagnosis(val);
            setResults(matches);
            setIsOpen(true);
        } else {
            setResults([]);
            setIsOpen(false);
        }
    };

    const handleSelect = (e, item) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const formattedDiagnosis = `[${item.código}] ${item.descripción}`;
        setQuery('');
        setIsOpen(false);
        if (onSelect) {
            onSelect(formattedDiagnosis);
        }
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        setIsFocused(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                className={`relative flex items-center transition-all duration-200 border rounded-xl bg-gray-50/50 shadow-sm overflow-hidden ${isFocused ? 'ring-2 ring-blue-100 border-blue-400 bg-white' : 'border-gray-300'}`}
                style={{ marginLeft: '4px', marginRight: '4px' }}
            >
                <div className="pl-3 pr-2 text-gray-400">
                    <Search size={16} />
                </div>
                <input
                    type="text"
                    className="w-full py-3.5 pr-10 text-base focus:outline-none bg-transparent placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="Buscar CIE-10 (mínimo 2 letras o código)..."
                    value={query}
                    onChange={handleSearch}
                    onFocus={() => {
                        setIsFocused(true);
                        if (query.length >= 2 && results.length > 0) setIsOpen(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                    disabled={disabled}
                    autoComplete="off"
                />
                {query && !disabled && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        title="Limpiar búsqueda"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && !disabled && (
                <div
                    className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ padding: '8px' }}
                >
                    {results.map((item, index) => (
                        <div
                            key={index}
                            className="px-4 py-3 rounded-lg hover:bg-blue-50 cursor-pointer flex flex-col gap-1 transition-colors group mb-1 last:mb-0"
                            onClick={(e) => handleSelect(e, item)}
                        >
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-lg font-bold text-gray-800 leading-tight group-hover:text-blue-700">
                                    {item.descripción}
                                </span>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-base font-bold bg-gray-100 text-gray-600 border border-gray-200 shadow-sm shrink-0">
                                    <Stethoscope size={16} />
                                    {item.código}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isOpen && query.length >= 2 && results.length === 0 && !disabled && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center text-sm text-gray-500 animate-in fade-in slide-in-from-top-2 duration-200">
                    No se encontraron resultados para "{query}"
                </div>
            )}
        </div>
    );
};

export default CIE10Autocomplete;
