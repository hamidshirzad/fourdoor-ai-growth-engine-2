import { motion } from 'motion/react';

export default function StatCard({ label, value, detail }) {
  return (
    <motion.div
      className="rounded-xl border border-white/10 bg-[#141416] p-5 cursor-default transition-colors hover:border-orange-500/30 hover:bg-[#18181b]"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <p className="text-sm text-neutral-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-neutral-50">{value}</p>
      {detail && <p className="mt-2 text-xs text-neutral-400">{detail}</p>}
    </motion.div>
  );
}
