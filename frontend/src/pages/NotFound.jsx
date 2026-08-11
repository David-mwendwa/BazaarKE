import { Link } from 'react-router-dom';

import { useCategories } from '../hooks/useCategories.js';

/**
 * A 404 that offers somewhere to go. The previous one had a single "Back to
 * home" button, which sends a shopper who mistyped a product URL back to the
 * start of the journey — the categories below let them pick up near where
 * they were aiming instead.
 */
const NotFound = () => {
  const { categories } = useCategories();

  return (
  <div className='mx-auto max-w-lg py-20 text-center'>
    <p className='font-heading text-6xl font-bold text-primary-700'>404</p>
    <h1 className='mt-4 font-heading text-xl font-bold text-dark-900'>Page not found</h1>
    <p className='mx-auto mt-2 max-w-sm text-sm text-dark-500'>
      The page you're looking for doesn't exist or may have moved.
    </p>

    <div className='mt-8 flex flex-col justify-center gap-3 sm:flex-row'>
      <Link
        to='/products'
        className='rounded-md bg-primary-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-primary-700'>
        Browse products
      </Link>
      <Link
        to='/'
        className='rounded-md border border-dark-300 px-6 py-2.5 font-semibold text-dark-700 transition-colors hover:border-primary-500 hover:text-primary-700'>
        Back to home
      </Link>
    </div>

    <div className='mt-10 border-t border-dark-200 pt-6'>
      <p className='text-xs font-semibold uppercase tracking-wide text-dark-500'>
        Or jump to a category
      </p>
      <div className='mt-3 flex flex-wrap justify-center gap-2'>
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            to={`/products?category=${cat.slug}`}
            className='rounded-full border border-dark-200 bg-white px-3.5 py-1.5 text-sm text-dark-600 transition-colors hover:border-primary-500 hover:text-primary-700'>
            {cat.label}
          </Link>
        ))}
      </div>
    </div>
  </div>
  );
};

export default NotFound;
