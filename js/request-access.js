const FORM_ENDPOINT = 'https://formsubmit.co/ajax/agrinovarobot@gmail.com';

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('request-access-modal');
    const trigger = document.getElementById('request-access-trigger');
    const closeBtn = document.getElementById('request-access-close');
    const cancelBtn = document.getElementById('request-access-cancel');
    const backdrop = document.getElementById('request-access-backdrop');
    const form = document.getElementById('request-access-form');
    const status = document.getElementById('request-access-status');
    const submitBtn = document.getElementById('request-access-submit');

    if (!modal || !trigger || !form || !status || !submitBtn) return;

    const openModal = () => {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    };

    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        status.textContent = '';
        status.className = 'request-access-status';
    };

    const setSubmitting = (isSubmitting) => {
        submitBtn.disabled = isSubmitting;
        if (cancelBtn) cancelBtn.disabled = isSubmitting;
        if (closeBtn) closeBtn.disabled = isSubmitting;
        submitBtn.innerHTML = isSubmitting
            ? '<i data-lucide="loader-circle" size="16" class="animate-spin"></i>Sending...'
            : '<i data-lucide="send" size="16"></i>Send Request';

        if (window.lucide) window.lucide.createIcons();
    };

    const buildMessage = (data) => `
New access request submitted from the AgriNova landing page.

Name: ${data.name}
Email: ${data.email}
Phone Number: ${data.phone}
Organization/Company: ${data.organization}

Message or Requirement:
${data.message}
    `.trim();

    trigger.addEventListener('click', openModal);

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const payload = {
            name: formData.get('name')?.toString().trim() || '',
            email: formData.get('email')?.toString().trim() || '',
            phone: formData.get('phone')?.toString().trim() || '',
            organization: formData.get('organization')?.toString().trim() || '',
            message: formData.get('message')?.toString().trim() || ''
        };

        status.textContent = '';
        status.className = 'request-access-status';
        setSubmitting(true);

        try {
            const response = await fetch(FORM_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({
                    _subject: `AgriNova Access Request - ${payload.name}`,
                    _template: 'table',
                    _captcha: 'false',
                    name: payload.name,
                    email: payload.email,
                    phone: payload.phone,
                    organization: payload.organization,
                    message: buildMessage(payload)
                })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.success === 'false') {
                throw new Error(result.message || 'Unable to send your request right now.');
            }

            status.textContent = 'Your request has been sent successfully. We will get back to you soon.';
            status.className = 'request-access-status is-success';
            form.reset();

            window.setTimeout(() => {
                closeModal();
            }, 1800);
        } catch (error) {
            console.error('Request access error:', error);
            status.textContent = 'We could not send your request right now. Please try again in a moment.';
            status.className = 'request-access-status is-error';
        } finally {
            setSubmitting(false);
        }
    });
});
