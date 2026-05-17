"use client";

import { motion } from "framer-motion";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-2 text-xs font-bold uppercase tracking-widest text-primary"
          >
            {eyebrow}
          </motion.p>
        ) : null}
        <motion.h1 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-extrabold tracking-tight md:text-5xl"
        >
          {title}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-lg text-muted-foreground"
        >
          {description}
        </motion.p>
      </div>
      {actions ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex shrink-0 flex-wrap gap-2 pt-2 md:pt-0"
        >
          {actions}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
