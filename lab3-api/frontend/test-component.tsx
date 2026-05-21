import { ChangeEvent, FormEvent, useState } from 'react';
import styles from './test-component.module.css';

export interface BlogPostFormValues {
	title: string;
	content: string;
}

export interface BlogPostFormProps {
	onSubmit: (values: BlogPostFormValues) => Promise<void> | void;
}

interface BlogPostFormErrors {
	title?: string;
	content?: string;
}

function validate(values: BlogPostFormValues): BlogPostFormErrors {
	const errors: BlogPostFormErrors = {};

	if (values.title.trim().length === 0) {
		errors.title = 'Title is required.';
	}

	if (values.content.trim().length === 0) {
		errors.content = 'Content is required.';
	}

	return errors;
}

export function BlogPostForm({ onSubmit }: BlogPostFormProps) {
	const [values, setValues] = useState<BlogPostFormValues>({
		title: '',
		content: '',
	});
	const [errors, setErrors] = useState<BlogPostFormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitMessage, setSubmitMessage] = useState<string | null>(null);

	function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
		const { name, value } = event.target;

		setValues((currentValues) => ({
			...currentValues,
			[name]: value,
		}));

		setErrors((currentErrors) => ({
			...currentErrors,
			[name]: undefined,
		}));

		setSubmitMessage(null);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();

		const nextErrors = validate(values);

		if (Object.keys(nextErrors).length > 0) {
			setErrors(nextErrors);
			setSubmitMessage('Please fix the highlighted fields.');
			return;
		}

		setIsSubmitting(true);
		setSubmitMessage(null);

		try {
			await onSubmit({
				title: values.title.trim(),
				content: values.content.trim(),
			});

			setValues({ title: '', content: '' });
			setErrors({});
			setSubmitMessage('Blog post created successfully.');
		} catch {
			setSubmitMessage('Unable to create the blog post right now.');
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form
			className={styles['blog-post-form']}
			onSubmit={handleSubmit}
			noValidate
			data-testid="blog-post-form"
			aria-label="Create a new blog post"
		>
			<div className={styles['blog-post-form__field']}>
				<label className={styles['blog-post-form__label']} htmlFor="title">
					Title
				</label>
				<input
					id="title"
					name="title"
					type="text"
					value={values.title}
					onChange={handleChange}
					className={styles['blog-post-form__input']}
					aria-label="Blog post title"
					aria-invalid={errors.title ? 'true' : 'false'}
					aria-describedby={errors.title ? 'title-error' : undefined}
					data-testid="blog-post-title"
					placeholder="Add a clear headline"
				/>
				{errors.title ? (
					<p id="title-error" className={styles['blog-post-form__error']} role="alert">
						{errors.title}
					</p>
				) : null}
			</div>

			<div className={styles['blog-post-form__field']}>
				<label className={styles['blog-post-form__label']} htmlFor="content">
					Content
				</label>
				<textarea
					id="content"
					name="content"
					value={values.content}
					onChange={handleChange}
					className={styles['blog-post-form__textarea']}
					aria-label="Blog post content"
					aria-invalid={errors.content ? 'true' : 'false'}
					aria-describedby={errors.content ? 'content-error' : undefined}
					data-testid="blog-post-content"
					placeholder="Write the main content of the blog post"
					rows={8}
				/>
				{errors.content ? (
					<p id="content-error" className={styles['blog-post-form__error']} role="alert">
						{errors.content}
					</p>
				) : null}
			</div>

			<div className={styles['blog-post-form__actions']}>
				<button
					type="submit"
					className={styles['blog-post-form__submit']}
					disabled={isSubmitting}
					aria-label="Create blog post"
					data-testid="blog-post-submit"
				>
					{isSubmitting ? 'Creating...' : 'Create Post'}
				</button>
			</div>

			{submitMessage ? (
				<p className={styles['blog-post-form__status']} role="status" aria-live="polite">
					{submitMessage}
				</p>
			) : null}
		</form>
	);
}

export default BlogPostForm;
