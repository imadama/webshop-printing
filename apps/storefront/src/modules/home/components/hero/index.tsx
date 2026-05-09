import { Button, Heading } from "@modules/common/components/ui";
import LocalizedClientLink from "@modules/common/components/localized-client-link";

const Hero = () => {
  return (
    <div className="h-[75vh] w-full border-b border-ui-border-base relative bg-ui-bg-subtle">
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-6">
        <span>
          <Heading
            level="h1"
            className="text-3xl small:text-4xl leading-tight text-ui-fg-base font-medium"
          >
            Eigen ontwerpen & custom 3D prints
          </Heading>
          <Heading
            level="h2"
            className="text-xl small:text-2xl leading-snug text-ui-fg-subtle font-normal mt-3"
          >
            Bestel uit onze collectie of upload je eigen STL — wij printen het.
          </Heading>
        </span>
        <div className="flex gap-3">
          <LocalizedClientLink href="/store">
            <Button variant="primary">Shop bekijken</Button>
          </LocalizedClientLink>
          <LocalizedClientLink href="/upload-print">
            <Button variant="secondary">Eigen STL uploaden</Button>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  );
};

export default Hero;
