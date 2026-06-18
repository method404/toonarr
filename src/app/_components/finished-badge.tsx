type FinishedBadgeProps = {
  size?: number;
  className?: string;
};

export function FinishedBadge({
  size = 20,
  className = "",
}: FinishedBadgeProps) {
  return (
    <span
      className={`finished-badge ${className}`.trim()}
      aria-label="Finished"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="10" fill="#7F7F7F" />
        <path
          d="M7.899 10.308c-.39.06-1.133.12-1.755.15V9.85c.757-.127 1.267-.637 1.267-1.297 0-.78-.69-1.358-1.642-1.358-.968 0-1.658.578-1.658 1.35 0 .668.503 1.178 1.268 1.305v.63c-.593.015-1.245.015-1.733.015l.113.645c1.44-.015 2.94-.09 4.207-.255l-.067-.577ZM9.061 6.91h-.765v4.995h.765V9.76h.96v-.637h-.96V6.91Zm.165 6.57v-.615h-3.78v-1.26h-.765v1.875h4.545ZM6.661 8.545c0 .368-.33.743-.892.743-.57 0-.9-.36-.9-.743 0-.375.33-.757.9-.757.562 0 .892.375.892.757ZM15.864 13.548v-.615h-3.802v-.578h3.577v-1.732h-4.395v.615h3.63v.547H11.29v1.763h4.575ZM13.57 7.225h-3.075v.638h2.213c-.248.997-1.253 1.732-2.543 1.965l.398.622c1.53-.382 2.94-1.402 3.007-3.225Zm2.07 3.045V6.91h-.765v.93h-1.222v.593h1.222v.622H13.54v.585h1.335v.63h.765Z"
          fill="#fff"
        />
      </svg>
    </span>
  );
}
