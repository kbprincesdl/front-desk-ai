interface ToothMascotProps {
  mood?: 'idle' | 'wave' | 'thinking';
  size?: 'sm' | 'md';
}

export function ToothMascot({ mood = 'idle', size = 'sm' }: ToothMascotProps) {
  const px = size === 'md' ? 52 : 34;

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        width={px}
        height={px}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Warm soft aura */}
        <circle cx="32" cy="34" r="27" className="fill-amber-100/80 dark:fill-teal-950/60" />

        {/* Friendly waving arm when mood === 'wave' */}
        {mood === 'wave' && (
          <path
            d="M49 33 C55 29 57 22 54 18"
            stroke="#0F766E"
            strokeWidth="4"
            strokeLinecap="round"
            className="animate-mascot-wave dark:stroke-teal-400"
          />
        )}

        {/* Tooth body */}
        <path
          d="M21 15 C15 15 11 20 12 28 C13 36 16 48 21 51 C24 53 26 48 28 43 C29 40 31 39 32 39 C33 39 35 40 36 43 C38 48 40 53 43 51 C48 48 51 36 52 28 C53 20 49 15 43 15 C39 15 35 17 32 17 C29 17 25 15 21 15 Z"
          className="fill-white stroke-teal-700 dark:fill-slate-100 dark:stroke-teal-500"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Rosy coral cheeks */}
        <circle cx="21" cy="30" r="2.6" fill="#F97360" fillOpacity="0.45" />
        <circle cx="43" cy="30" r="2.6" fill="#F97360" fillOpacity="0.45" />

        {/* Eyes */}
        {mood === 'thinking' ? (
          <>
            <circle cx="25" cy="25" r="2.1" fill="#1E293B" />
            <circle cx="39" cy="25" r="2.1" fill="#1E293B" />
            <path
              d="M28 33 Q32 31 36 33"
              stroke="#0F766E"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <circle cx="25" cy="26" r="2.2" fill="#1E293B" />
            <circle cx="39" cy="26" r="2.2" fill="#1E293B" />
            <path
              d="M26 32 Q32 37 38 32"
              stroke="#0F766E"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Thinking dots above tooth when thinking */}
        {mood === 'thinking' && (
          <g>
            <circle cx="45" cy="11" r="2.2" fill="#EA580C" className="animate-typing-dot" />
            <circle
              cx="52"
              cy="8"
              r="2.8"
              fill="#EA580C"
              className="animate-typing-dot"
              style={{ animationDelay: '0.2s' }}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
