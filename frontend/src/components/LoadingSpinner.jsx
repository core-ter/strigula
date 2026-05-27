function LoadingSpinner({ text = 'Betöltés...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-4 font-medium">{text}</p>
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 text-center">
      <svg className="w-8 h-8 text-red-400 dark:text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm font-medium text-red-700 dark:text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors"
        >
          Újra
        </button>
      )}
    </div>
  )
}

export { LoadingSpinner, ErrorBanner }
