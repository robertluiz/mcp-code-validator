import neo4j, { Driver } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

let driver: Driver;

/**
 * Initializes and returns the Neo4j driver instance.
 * @returns {Driver} The Neo4j driver.
 */
export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      throw new Error('Neo4j environment variables (NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD) are not set.');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    console.log('Neo4j driver initialized.');
  }
  return driver;
}

/**
 * Closes the Neo4j driver connection.
 */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    console.log('Neo4j driver closed.');
  }
}