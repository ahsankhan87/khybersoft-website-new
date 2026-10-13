<section class="py-20">
    <div class="max-w-4xl mx-auto px-4">
        <h1 class="font-display text-5xl font-bold mb-6">Contact Us</h1>
        <p class="text-xl text-slate-400 mb-8">Get in touch with our team</p>

        <?php if ($success = get_flash('success')): ?>
        <div class="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300">
            <?= e($success) ?>
        </div>
        <?php endif; ?>

        <form method="POST" action="<?= url('/contact') ?>" class="space-y-6">
            <?= \App\Core\CSRF::field() ?>
            
            <div class="grid md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Name</label>
                    <input type="text" name="name" required value="<?= old('name') ?>"
                           class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Email</label>
                    <input type="email" name="email" required value="<?= old('email') ?>"
                           class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                <input type="text" name="subject" required value="<?= old('subject') ?>"
                       class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
            </div>

            <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Message</label>
                <textarea name="message" rows="6" required
                          class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"><?= old('message') ?></textarea>
            </div>

            <button type="submit" class="w-full px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors">
                Send Message
            </button>
        </form>
    </div>
</section>
