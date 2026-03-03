interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  title?: string;
}

export function Checkbox({ checked, onChange, title }: CheckboxProps) {
  return (
    <div
      className={`checkbox${checked ? ' checked' : ''}`}
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange();
        }
      }}
      title={title}
    >
      {checked && '\u2713'}
    </div>
  );
}
