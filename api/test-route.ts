export interface BlogPost {
	id: string;
	title: string;
	content: string;
	createdAt: string;
}

export interface CreateBlogPostInput {
	title: string;
	content: string;
}

export interface BlogPostRepository {
	create(input: CreateBlogPostInput): Promise<BlogPost>;
}
export interface CreateBlogPostRequest {
	body: Partial<CreateBlogPostInput>;
}

export interface CreateBlogPostResponse {
	status(code: number): CreateBlogPostResponse;
	json(payload: unknown): void;
}

export type NextFunction = (error?: unknown) => void;

function validateCreateBlogPostInput(input: Partial<CreateBlogPostInput>): string[] {
	const errors: string[] = [];

	if (typeof input.title !== 'string' || input.title.trim().length === 0) {
		errors.push('title is required');
	}

	if (typeof input.content !== 'string' || input.content.trim().length === 0) {
		errors.push('content is required');
	}

	return errors;
}

/**
 * Creates an async request handler for blog post creation.
 *
 * @param repository - Repository used to persist blog posts.
 * @returns A request handler that validates input and returns the created post.
 */
export function createBlogPostHandler(repository: BlogPostRepository) {
	return async (
		req: CreateBlogPostRequest,
		res: CreateBlogPostResponse,
		next: NextFunction,
	): Promise<void> => {
		try {
			const errors = validateCreateBlogPostInput(req.body);

			if (errors.length > 0) {
				res.status(400).json({
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Request validation failed.',
						details: errors,
					},
				});
				return;
			}

			const payload = req.body as CreateBlogPostInput;
			const blogPost = await repository.create({
				title: payload.title.trim(),
				content: payload.content.trim(),
			});

			res.status(201).json({ data: blogPost });
		} catch (error) {
			next(error);
		}
	};
}
