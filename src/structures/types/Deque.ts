export class Deque<T> {
    private _array: T[];

    constructor(array?: T[]) {
        this._array = array ?? [];
    }

    public enqueue(value: T, index?: number) {
        if (index) {
            this._array.splice(index, 0, value);
        } else {
            this._array.push(value);
        }
    }
    
    public peek(index: number = 0) {
        return this._array[index];
    }

    public dequeue() {
        return this._array.shift();
    }

    public clear() {
        this._array = [];
    }
}