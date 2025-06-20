"use strict";
// Simple working tests to demonstrate test setup
describe('Basic Test Suite', () => {
    it('should run a basic test', () => {
        expect(1 + 1).toBe(2);
    });
    it('should test string operations', () => {
        const text = 'Hello World';
        expect(text.toLowerCase()).toBe('hello world');
        expect(text.split(' ')).toEqual(['Hello', 'World']);
    });
    it('should test array operations', () => {
        const arr = [1, 2, 3, 4, 5];
        expect(arr.length).toBe(5);
        expect(arr.filter(n => n > 3)).toEqual([4, 5]);
    });
    it('should test async operations', async () => {
        const promise = Promise.resolve('success');
        await expect(promise).resolves.toBe('success');
    });
    it('should test object operations', () => {
        const obj = { name: 'test', value: 42 };
        expect(obj).toHaveProperty('name');
        expect(obj.name).toBe('test');
        expect(Object.keys(obj)).toEqual(['name', 'value']);
    });
});
