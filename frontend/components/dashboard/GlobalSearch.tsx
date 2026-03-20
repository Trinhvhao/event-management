'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchResult {
    type: 'event' | 'student' | 'user';
    id: string;
    title: string;
    subtitle?: string;
}

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const searchData = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const response = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(query)}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setResults(data.data || []);
                } else {
                    setResults([]);
                }
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(searchData, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    return (
        <div ref={searchRef} className="relative flex-1 max-w-xl">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Tìm kiếm sự kiện, sinh viên, MSSV..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setResults([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                        <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {isOpen && query.length >= 2 && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500">Đang tìm kiếm...</div>
                    ) : results.length > 0 ? (
                        <ul className="py-2">
                            {results.map((result) => (
                                <li key={result.id}>
                                    <a
                                        href={`/dashboard/${result.type}s/${result.id}`}
                                        className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 text-xs rounded ${result.type === 'event' ? 'bg-blue-100 text-blue-700' :
                                                result.type === 'student' ? 'bg-green-100 text-green-700' :
                                                    'bg-purple-100 text-purple-700'
                                                }`}>
                                                {result.type === 'event' ? 'Sự kiện' :
                                                    result.type === 'student' ? 'Sinh viên' : 'Người dùng'}
                                            </span>
                                            <div>
                                                <div className="font-medium text-gray-900">{result.title}</div>
                                                {result.subtitle && (
                                                    <div className="text-sm text-gray-500">{result.subtitle}</div>
                                                )}
                                            </div>
                                        </div>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 text-center text-gray-500">Không tìm thấy kết quả</div>
                    )}
                </div>
            )}
        </div>
    );
}
