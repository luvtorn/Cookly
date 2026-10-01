const en = {
  "verification.NONE": "Not reviewed",
  "verification.PENDING": "Awaiting review",
  "verification.VERIFIED": "Cookly verified",
  "verification.REJECTED": "Needs changes",
  "verification.request": "Request Cookly review",
  "verification.note": "Message to the editor (optional)",
  "verification.help":
    "Your recipe stays published. Reviews have no guaranteed completion date.",
  "verification.feedback": "Message from Cookly",
  "verification.editFirst":
    "Update your recipe before requesting another review.",
  "verification.sent": "Review requested.",
  "verification.pending": "Sending request…",
  "verification.error":
    "Unable to request review. Refresh the page and try again.",
  "verification.limit":
    "You can submit up to ten review requests in 24 hours. Please try later.",
};
type Messages = Record<keyof typeof en, string>;
const ru: Messages = {
  "verification.NONE": "Без проверки",
  "verification.PENDING": "Ожидает проверки",
  "verification.VERIFIED": "Проверено Cookly",
  "verification.REJECTED": "Нужны уточнения",
  "verification.request": "Запросить проверку Cookly",
  "verification.note": "Сообщение редактору (необязательно)",
  "verification.help":
    "Рецепт остаётся опубликованным. Срок проверки не гарантирован.",
  "verification.feedback": "Сообщение от Cookly",
  "verification.editFirst":
    "Исправьте рецепт перед повторной заявкой на проверку.",
  "verification.sent": "Заявка отправлена.",
  "verification.pending": "Отправляем заявку…",
  "verification.error":
    "Не удалось отправить заявку. Обновите страницу и попробуйте снова.",
  "verification.limit":
    "Можно отправить до десяти заявок за 24 часа. Попробуйте позже.",
};
const pl: Messages = {
  "verification.NONE": "Bez weryfikacji",
  "verification.PENDING": "Oczekuje na weryfikację",
  "verification.VERIFIED": "Zweryfikowano przez Cookly",
  "verification.REJECTED": "Wymaga zmian",
  "verification.request": "Poproś Cookly o weryfikację",
  "verification.note": "Wiadomość do redakcji (opcjonalnie)",
  "verification.help":
    "Przepis pozostaje opublikowany. Termin weryfikacji nie jest gwarantowany.",
  "verification.feedback": "Wiadomość od Cookly",
  "verification.editFirst": "Popraw przepis przed ponownym zgłoszeniem.",
  "verification.sent": "Wniosek wysłany.",
  "verification.pending": "Wysyłanie wniosku…",
  "verification.error":
    "Nie udało się wysłać wniosku. Odśwież stronę i spróbuj ponownie.",
  "verification.limit":
    "Możesz wysłać do dziesięciu wniosków w ciągu 24 godzin. Spróbuj później.",
};
export const verificationMessages = { en, ru, pl };
