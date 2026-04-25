import ReactGA from "react-ga4";

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export const initGA = () => {
  console.log("GA ID:", GA_ID);

  if (!GA_ID) {
    console.warn("Google Analytics ID is missing.");
    return;
  }

  ReactGA.initialize(GA_ID);
  console.log("Google Analytics initialized.");
};

export const trackPageView = (path) => {
  console.log("GA Page View:", path);

  if (!GA_ID) return;

  ReactGA.send({
    hitType: "pageview",
    page: path,
  });
};

export const trackEvent = (category, action, label = "") => {
  console.log("GA Event:", category, action, label);

  if (!GA_ID) return;

  ReactGA.event({
    category,
    action,
    label,
  });
};