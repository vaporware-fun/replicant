# Contributing to Replicant

We love your input! We want to make contributing to Replicant as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/replicant.git
cd replicant
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file for development:
```env
ANTHROPIC_API_KEY=your_test_key
DISCORD_TOKEN=your_test_token
TELEGRAM_TOKEN=your_test_token
```

4. Build the project:
```bash
npm run build
```

5. Run tests:
```bash
npm test
```

## Project Structure

```
replicant/
├── src/
│   ├── core/           # Core framework components
│   ├── integrations/   # Platform integrations
│   ├── utils/          # Utility functions
│   ├── examples/       # Example implementations
│   └── cli/            # CLI tools
├── tests/              # Test files
├── docs/               # Documentation
└── scripts/            # Build and maintenance scripts
```

## Code Style

- We use TypeScript for type safety
- Follow the existing code style
- Use meaningful variable names
- Write descriptive commit messages
- Comment your code when necessary
- Use ESLint and Prettier for formatting

## Pull Request Process

1. Update the README.md with details of changes to the interface
2. Update the API.md with any API changes
3. Update the package.json version following [SemVer](http://semver.org/)
4. The PR will be merged once you have the sign-off of two maintainers

## Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Include integration tests for platform integrations
- Test edge cases and error handling

```typescript
// Example test structure
describe('Agent', () => {
    let agent: Agent;
    
    beforeEach(() => {
        agent = new Agent({
            domain: 'test',
            userId: 'test-agent',
            platform: 'test',
            capabilities: ['test'],
            permissions: ['test']
        });
    });
    
    it('should process messages correctly', async () => {
        // Test implementation
    });
});
```

## Documentation

- Keep README.md updated
- Document all public APIs in API.md
- Include JSDoc comments for TypeScript interfaces
- Provide examples for new features
- Update changelog for significant changes

## Issue Reporting

### Bug Reports

When reporting bugs, include:

1. Quick summary and/or background
2. Steps to reproduce
   - Be specific!
   - Provide sample code if possible
3. What you expected would happen
4. What actually happens
5. Notes (possibly including why you think this might be happening)

### Feature Requests

When requesting features:

1. Explain the problem you're trying to solve
2. Describe the solution you'd like
3. Describe alternatives you've considered
4. Note any additional context

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## References

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Discord.js Guide](https://discordjs.guide/)
- [Telegraf Documentation](https://telegraf.js.org/)
- [Anthropic Claude Documentation](https://docs.anthropic.com/claude/) 