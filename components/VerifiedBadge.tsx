export default function VerifiedBadge() {
  return (
    <svg
      className="verified"
      viewBox="0 0 24 24"
      width="19"
      height="19"
      aria-label="Verified paid account"
      role="img"
    >
      <circle cx="12" cy="12" r="12" fill="#0095F6" />

      <path
        d="m6.7 12.3 3.4 3.3 7.3-7.4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}