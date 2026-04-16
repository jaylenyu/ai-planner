export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  const borderSizes = { sm: 'border-2', md: 'border-[3px]', lg: 'border-4' };
  return (
    <div
      className={`${sizes[size]} ${borderSizes[size]} animate-spin rounded-full border-stone-200 border-t-orange-500`}
    />
  );
}
