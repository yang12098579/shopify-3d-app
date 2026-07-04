import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Vision3D - 3D Product Viewer</h1>
        <p className={styles.text}>
          Bring your products to life with interactive 3D and AR previews.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Interactive 3D Previews.</strong> Let customers rotate, zoom, and inspect products from every angle before purchase.
          </li>
          <li>
            <strong>Mobile AR Projection.</strong> Place products in real-world spaces via smartphone AR for confident buying decisions.
          </li>
          <li>
            <strong>Seamless Shopify Integration.</strong> One-click theme block install. No coding required.
          </li>
        </ul>
      </div>
    </div>
  );
}