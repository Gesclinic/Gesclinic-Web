import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);

  // Evita piscar no carregamento inicial (SSR/Horizon)
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) {
    // Fallback instantâneo enquanto Framer monta
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 border-4 border-blue-200 animate-spin">
          <span className="text-blue-700 dark:text-blue-300 font-bold text-2xl">G</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mt-6">
          Gesclinic Web
        </h1>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-100 border-4 border-blue-200 shadow-md"
          animate={{
            rotate: [0, 360],
            borderColor: ['#1A5B8A', '#5DB053', '#1A5B8A'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <motion.span
            className="text-blue-700 dark:text-blue-300 font-bold text-2xl"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            G
          </motion.span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-6"
        >
          Gesclinic Web
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.8, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-gray-500 dark:text-gray-400 text-sm mt-2"
        >
          Carregando sessão segura...
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
