import { Variants } from 'framer-motion';

export const fadeSlideUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 120, damping: 20 }
    }
};

export const pageTransition: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', mass: 0.5, damping: 20 }
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: { duration: 0.15 }
    }
};