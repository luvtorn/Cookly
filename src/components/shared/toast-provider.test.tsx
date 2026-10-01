import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast-provider";
import { I18nProvider } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";

function Trigger() {
  const notify = useToast();
  return <button onClick={() => notify("auth.signedIn")}>Notify</button>;
}
afterEach(() => vi.useRealTimers());

it("localizes notifications, pauses on focus, and expires after leaving focus", () => {
  vi.useFakeTimers();
  render(
    <I18nProvider locale="ru" messages={getMessages("ru")}>
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    </I18nProvider>,
  );
  fireEvent.click(screen.getByText("Notify"));
  expect(screen.getByRole("status")).toHaveTextContent("Вы вошли в аккаунт");
  const close = screen.getByRole("button", { name: "Закрыть" });
  fireEvent.focus(close);
  act(() => vi.advanceTimersByTime(10000));
  expect(close).toBeInTheDocument();
  fireEvent.blur(close);
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});
