import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ items }) {
  const location = useLocation();

  // Caso não venham breadcrumbs, cria automático
  const autoItems = location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment, idx, arr) => {
      const path = '/' + arr.slice(0, idx + 1).join('/');
      return {
        label: segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        path,
      };
    });

  const breadcrumbs = items?.length ? items : autoItems;

  return (
    <nav className="flex items-center text-sm text-gray-500 space-x-2">
      {breadcrumbs.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}

          {item.path ? (
            <Link to={item.path} className="hover:text-blue-600 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-700 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
