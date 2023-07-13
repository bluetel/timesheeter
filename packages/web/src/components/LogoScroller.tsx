import React from "react";
import { type IconType } from "react-icons";
import { INTEGRATION_DEFINITIONS } from "@timesheeter/web/lib/workspace/integrations";

interface Logo {
  icon: IconType;
  alt: string;
}

interface LogoScrollerProps {
  logos?: Logo[];
}

const DEFAULT_LOGOS: Logo[] = Object.values(INTEGRATION_DEFINITIONS).map(
  (integration) => ({
    icon: integration.icon,
    alt: integration.name,
  })
);

export const LogoScroller = ({ logos = DEFAULT_LOGOS }: LogoScrollerProps) => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="slider-container">
        <div className="slider-content-wrapper fast space-x-32">
          {logos.map((logo) => (
            <div className="logo" key={logo.alt}>
              <logo.icon size={100} className="text-gray-500" />
            </div>
          ))}{" "}
          {logos.map((logo) => (
            <div className="logo" key={logo.alt}>
              <logo.icon size={100} className="text-gray-500" />
            </div>
          ))}{" "}
          {logos.map((logo) => (
            <div className="logo" key={logo.alt}>
              <logo.icon size={100} className="text-gray-500" />
            </div>
          ))}{" "}
          {logos.map((logo) => (
            <div className="logo" key={logo.alt}>
              <logo.icon size={100} className="text-gray-500" />
            </div>
          ))}{" "}
          {logos.map((logo) => (
            <div className="logo" key={logo.alt}>
              <logo.icon size={100} className="text-gray-500" />
            </div>
          ))}{" "}
          {logos.map((logo) => (
            <div className="logo" key={logo.alt}>
              <logo.icon size={100} className="text-gray-500" />
            </div>
          ))}{" "}
          {logos.map((logo) => (
            <div className="logo" key={logo.alt}>
              <logo.icon size={100} className="text-gray-500" />
            </div>
          ))}{" "}
          {logos.map((logo) => (
            <div className="logo" key={logo.alt}>
              <logo.icon size={100} className="text-gray-500" />
            </div>
          ))}
        </div>
      </div>
      {/* <div className="slider-container">
        <div className="slider-content-wrapper slow">
          <Rectangle />
          <Rectangle />
          <Rectangle />
          <Rectangle />
          <Rectangle />
          <Rectangle />
          <Rectangle />
          <Rectangle />
        </div>
      </div> */}
    </div>
  );
};
