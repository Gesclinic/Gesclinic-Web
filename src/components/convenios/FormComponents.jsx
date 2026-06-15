/**
 * Componentes reutilizáveis para organizar campos nas abas do modal de Convênios
 */

/**
 * Seção com header, descrição e campos
 */
export const FormSection = ({ icon, title, description, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-5 ${className}`}>
      <div className="mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          {icon && <span className="text-2xl mt-1">{icon}</span>}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
          </div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
};

/**
 * Campo simples com label
 */
export const FormField = ({
  label,
  required = false,
  error,
  hint,
  children,
  layout = 'vertical',
}) => {
  return (
    <div className={layout === 'horizontal' ? 'flex items-end gap-4' : ''}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 ${layout === 'horizontal' ? 'flex-1' : 'mb-1'}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={layout === 'horizontal' ? 'flex-1' : ''}>
        {children}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </div>
    </div>
  );
};

/**
 * Grid de campos com responsividade
 */
export const FormGrid = ({ children, columns = 2 }) => {
  const colClass =
    {
      1: 'grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
    }[columns] || 'md:grid-cols-2';

  return <div className={`grid grid-cols-1 gap-4 ${colClass}`}>{children}</div>;
};

/**
 * Card informativo com estatísticas
 */
export const InfoCard = ({ label, value, unit = '', icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-900',
    green: 'bg-green-50 text-green-900',
    orange: 'bg-orange-50 text-orange-900',
    red: 'bg-red-50 text-red-900',
    purple: 'bg-purple-50 text-purple-900',
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-75">{label}</p>
          <p className="text-lg font-bold mt-1">
            {value}
            {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
          </p>
        </div>
        {icon && <span className="text-2xl opacity-50">{icon}</span>}
      </div>
    </div>
  );
};

/**
 * Checkbox com estilo melhorado
 */
export const FormCheckbox = ({ id, label, checked, onChange, disabled, hint, color = 'blue' }) => {
  const colorClasses = {
    blue: 'accent-blue-600',
    green: 'accent-green-600',
    orange: 'accent-orange-600',
    red: 'accent-red-600',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`w-4 h-4 rounded border-gray-300 mt-0.5 cursor-pointer ${colorClasses[color]}`}
      />
      <label htmlFor={id} className="flex-1 cursor-pointer">
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
      </label>
    </div>
  );
};

/**
 * Select customizado
 */
export const FormSelect = ({
  label,
  required = false,
  options = [],
  value,
  onChange,
  disabled,
  placeholder = 'Selecione uma opção',
  error,
  hint,
}) => {
  return (
    <FormField label={label} required={required} error={error} hint={hint}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
};

/**
 * Input customizado
 */
export const FormInput = ({
  label,
  required = false,
  type = 'text',
  value,
  onChange,
  disabled,
  placeholder,
  error,
  hint,
}) => {
  return (
    <FormField label={label} required={required} error={error} hint={hint}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </FormField>
  );
};

export default {
  FormSection,
  FormField,
  FormGrid,
  InfoCard,
  FormCheckbox,
  FormSelect,
  FormInput,
};
