// /* eslint-disable import/first */
// import * as faker from 'faker';

// const deployMock = jest.fn();

// jest.mock('../cloudFormation.core', () => ({
//   deploy: deployMock,
// }));

// const stackName = faker.random.word();

// jest.mock('./getStackName', () => ({
//   getStackName: jest.fn().mockResolvedValue(stackName),
// }));

// const template = faker.random.word();

// jest.mock('./getCicdTemplate', () => ({
//   getCicdTemplate: jest.fn().mockReturnValue(template),
// }));

// import { deployCicd } from './deployCicd';

// test('should call deploy method with correctly parameters', async () => {
//   await deployCicd();
//   expect(deployMock).toHaveBeenCalledWith({
//     params: { StackName: stackName },
//     terminationProtection: true,
//     template,
//   });
// });
