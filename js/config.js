/* Hier trägst du alles ein. Nur diese Datei ändern, dann Commit und Push. */
window.DJELIX = {
  // Anfragen, Liedwünsche und Termine laufen über JARVIS. Nicht ändern.
  api: 'https://rfjvraagaqsjeuopspvl.supabase.co/functions/v1/djelix',
  // Booking-Anfragen gehen zusätzlich als Mail raus (FormSubmit). Nach der ersten Anfrage kommt eine
  // Bestätigungsmail, danach gibt es eine Zufallsadresse, die hier die Mail ersetzen kann.
  formular: 'https://formsubmit.co/ajax/kasper_news@outlook.com',
  soundcloud: 'https://soundcloud.com/kasprdj',
  // Termine trägst du in JARVIS ein (DJ, Termine). Die Liste hier ist nur der Rückfall, falls JARVIS nicht antwortet.
  termine: [
    { datum: '2026-12-18', ort: 'Sixty Twenty', stadt: 'Innsbruck' },
  ],
};
