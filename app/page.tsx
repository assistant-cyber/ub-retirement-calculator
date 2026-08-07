import Wizard from "@/components/Wizard";

export default function Page() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold sm:text-4xl">
        Are you on track for retirement?
      </h1>
      <p className="mb-8 max-w-2xl text-gray-600">
        Answer a few quick questions about your goals and savings, and we&apos;ll estimate
        whether you&apos;re on track — in about two minutes.
      </p>
      <Wizard />
    </>
  );
}
