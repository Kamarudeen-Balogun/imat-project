import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-14 text-center sm:px-6">
      <p className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-primary">404</p>
      <h1 className="mt-3 text-3xl font-bold text-textDefault md:text-4xl">
        This page could not be found.
      </h1>
      <p className="mt-4 max-w-md text-text2">
        The link may be outdated, or the page may have moved. Check the address, or head back to the
        IMAT home page.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-primary/20 transition-colors hover:brightness-110"
      >
        Back to home
      </Link>
    </div>
  );
}
