(function () {
  const contactForm = document.querySelector(".contact-form");
  if (!contactForm) return;

  const submitButton = contactForm.querySelector(".submit-button");
  const honeypotInput = contactForm.querySelector("#contact-leave-blank");
  const errorMessage = contactForm.querySelector(".form-error");
  const submitLabel = submitButton.textContent;

  function showThanks() {
    const thanks = document.createElement("p");
    thanks.className = "form-thanks";
    thanks.setAttribute("role", "status");
    thanks.tabIndex = -1;
    thanks.textContent = "Thanks. Your message is on its way.";
    contactForm.replaceWith(thanks);
    thanks.focus();
  }

  function setSending(isSending) {
    submitButton.disabled = isSending;
    submitButton.textContent = isSending ? "Sending…" : submitLabel;
  }

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.hidden = true;

    if (honeypotInput.value) {
      showThanks();
      return;
    }

    setSending(true);
    try {
      // Google Forms sends no CORS headers, so the response is opaque: completing without a network error is the only success signal.
      await fetch(contactForm.action, {
        method: "POST",
        mode: "no-cors",
        body: new URLSearchParams(new FormData(contactForm)),
      });
      showThanks();
    } catch (error) {
      setSending(false);
      errorMessage.hidden = false;
    }
  });
})();
