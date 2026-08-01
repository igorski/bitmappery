export type DeepPartial<T> = T extends Function
    ? T
    : T extends Array<infer InferredArrayMember>
    ? _DeepPartialArray<InferredArrayMember>
    : T extends object
    ? _DeepPartialObject<T>
    : T | undefined;

type _DeepPartialArray<T> = Array<DeepPartial<T>>;

type _DeepPartialObject<T> = {
    [Key in keyof T]?: DeepPartial<T[Key]>;
};
